import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import JSZip from "jszip";

import { authenticate } from "../shopify.server";
import { getQRCodes } from "../models/QRCode.server";

// [START loader]
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const qrCodes = await getQRCodes(admin.graphql, session.shop);

  return {
    qrCodes,
  };
}
// [END loader]

// [START empty]
const EmptyQRCodeState = () => (
  <s-section accessibilityLabel="Empty state section">
    <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
      <s-box maxInlineSize="200px" maxBlockSize="200px">
        <s-image
          aspectRatio="1/0.5"
          src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          alt="A stylized graphic of a document"
        />
      </s-box>
      <s-grid justifyItems="center" maxBlockSize="450px" maxInlineSize="450px">
        <s-heading>Create unique QR codes for your products</s-heading>
        <s-paragraph>
          Allow customers to scan codes and buy products using their phones.
        </s-paragraph>
        <s-stack
          gap="small-200"
          justifyContent="center"
          padding="base"
          paddingBlockEnd="none"
          direction="inline"
        >
          <s-button href="/app/qrcodes/new" variant="primary">
            Create QR code
          </s-button>
        </s-stack>
      </s-grid>
    </s-grid>
  </s-section>
);
// [END empty]

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export default function Index() {
  const { qrCodes } = useLoaderData();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Selection State for Bulk Actions
  const [selectedHandles, setSelectedHandles] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter & Sort Logic
  const filteredQRCodes = useMemo(() => {
    return qrCodes
      .filter((qr) => {
        // Search by QR title or Product title
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = qr.title?.toLowerCase().includes(q);
          const matchProduct = qr.productTitle?.toLowerCase().includes(q);
          if (!matchTitle && !matchProduct) return false;
        }

        // Filter by destination
        if (destinationFilter !== "all") {
          if (qr.destination !== destinationFilter) return false;
        }

        // Filter by discount code presence
        if (discountFilter === "with_discount") {
          if (!qr.discountCode) return false;
        } else if (discountFilter === "no_discount") {
          if (qr.discountCode) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortBy === "scans_desc") {
          return (Number(b.scans) || 0) - (Number(a.scans) || 0);
        }
        if (sortBy === "title_asc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        return 0;
      });
  }, [qrCodes, searchQuery, destinationFilter, discountFilter, sortBy]);

  // Bulk Selection Handlers
  const isAllSelected =
    filteredQRCodes.length > 0 &&
    filteredQRCodes.every((qr) => selectedHandles.includes(qr.handle));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedHandles([]);
    } else {
      setSelectedHandles(filteredQRCodes.map((qr) => qr.handle));
    }
  };

  const toggleSelect = (handle) => {
    if (selectedHandles.includes(handle)) {
      setSelectedHandles(selectedHandles.filter((h) => h !== handle));
    } else {
      setSelectedHandles([...selectedHandles, handle]);
    }
  };

  const activeSelectedItems = useMemo(() => {
    if (selectedHandles.length === 0) return filteredQRCodes;
    return filteredQRCodes.filter((qr) => selectedHandles.includes(qr.handle));
  }, [filteredQRCodes, selectedHandles]);

  // Bulk Download ZIP Handler
  const handleDownloadZip = async () => {
    if (activeSelectedItems.length === 0) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("qr-codes");

      for (const item of activeSelectedItems) {
        if (item.image) {
          const base64Data = item.image.replace(/^data:image\/png;base64,/, "");
          const fileName = `${item.title ? item.title.replace(/[^a-z0-9_-]/gi, "_") : item.handle}.png`;
          folder.file(fileName, base64Data, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `shopify-qrcodes-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to generate zip", err);
      alert("Failed to create ZIP export.");
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDestinationFilter("all");
    setDiscountFilter("all");
    setSortBy("newest");
  };

  if (qrCodes.length === 0) {
    return (
      <s-page heading="QR codes">
        <s-button slot="primary-action" variant="primary" href="/app/qrcodes/new">
          Create QR code
        </s-button>
        <EmptyQRCodeState />
      </s-page>
    );
  }

  return (
    <s-page heading="QR codes">
      <s-button slot="primary-action" variant="primary" href="/app/qrcodes/new">
        Create QR code
      </s-button>

      {/* [START Filters & Search Card] */}
      <s-section>
        <s-stack gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-box style={{ flex: 2, minWidth: "220px" }}>
              <s-text-field
                placeholder="Search by title or product name..."
                value={searchQuery}
                onInput={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              ></s-text-field>
            </s-box>

            <s-box style={{ flex: 1, minWidth: "150px" }}>
              <s-select
                label="Destination"
                labelHidden
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
              >
                <s-option value="all">All Destinations</s-option>
                <s-option value="product">Product page</s-option>
                <s-option value="cart">Cart / Checkout</s-option>
              </s-select>
            </s-box>

            <s-box style={{ flex: 1, minWidth: "150px" }}>
              <s-select
                label="Discount"
                labelHidden
                value={discountFilter}
                onChange={(e) => setDiscountFilter(e.target.value)}
              >
                <s-option value="all">All Discounts</s-option>
                <s-option value="with_discount">With Discount Code</s-option>
                <s-option value="no_discount">Without Discount</s-option>
              </s-select>
            </s-box>

            <s-box style={{ flex: 1, minWidth: "150px" }}>
              <s-select
                label="Sort By"
                labelHidden
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <s-option value="newest">Newest first</s-option>
                <s-option value="oldest">Oldest first</s-option>
                <s-option value="scans_desc">Most scans</s-option>
                <s-option value="title_asc">Title (A-Z)</s-option>
              </s-select>
            </s-box>
          </s-stack>

          {/* Active summary & reset */}
          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
            <s-text color="subdued">
              Showing {filteredQRCodes.length} of {qrCodes.length} QR code{qrCodes.length === 1 ? "" : "s"}
              {selectedHandles.length > 0 && ` (${selectedHandles.length} selected)`}
            </s-text>

            <s-stack direction="inline" gap="small-200">
              {(searchQuery || destinationFilter !== "all" || discountFilter !== "all" || sortBy !== "newest") && (
                <s-button onClick={clearFilters} variant="tertiary">
                  Clear filters
                </s-button>
              )}
              <s-button
                onClick={handleDownloadZip}
                disabled={filteredQRCodes.length === 0 || isExporting}
              >
                {isExporting ? "Exporting..." : `Download ZIP (${selectedHandles.length > 0 ? selectedHandles.length : "All"})`}
              </s-button>
              <s-button
                onClick={() => setIsPrintModalOpen(true)}
                disabled={filteredQRCodes.length === 0}
              >
                Print Stickers ({selectedHandles.length > 0 ? selectedHandles.length : "All"})
              </s-button>
            </s-stack>
          </s-stack>
        </s-stack>
      </s-section>
      {/* [END Filters & Search Card] */}

      {/* [START Table / Filtered Empty] */}
      {filteredQRCodes.length === 0 ? (
        <s-section>
          <s-stack gap="base" alignItems="center" paddingBlock="large-400">
            <s-heading>No QR codes found</s-heading>
            <s-paragraph>Try adjusting your search or filter options to find what you are looking for.</s-paragraph>
            <s-button onClick={clearFilters}>Reset all filters</s-button>
          </s-stack>
        </s-section>
      ) : (
        <s-section padding="none" accessibilityLabel="QRCode table">
          <s-table>
            <s-table-header-row>
              <s-table-header style={{ width: "40px" }}>
                <input
                  type="checkbox"
                  aria-label="Select all QR codes"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
              </s-table-header>
              <s-table-header listSlot="primary">Title</s-table-header>
              <s-table-header>Product</s-table-header>
              <s-table-header>Destination & Discount</s-table-header>
              <s-table-header>Date created</s-table-header>
              <s-table-header>Scans</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {filteredQRCodes.map((qrCode) => {
                const isSelected = selectedHandles.includes(qrCode.handle);
                return (
                  <s-table-row id={qrCode.handle} key={qrCode.handle}>
                    <s-table-cell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${qrCode.title}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(qrCode.handle)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <s-clickable
                          href={`/app/qrcodes/${qrCode.handle}`}
                          accessibilityLabel={`Go to QR code ${qrCode.title}`}
                          border="base"
                          borderRadius="base"
                          overflow="hidden"
                          inlineSize="32px"
                          blockSize="32px"
                        >
                          {qrCode.image ? (
                            <s-image objectFit="cover" src={qrCode.image}></s-image>
                          ) : (
                            <s-icon size="large" type="image" />
                          )}
                        </s-clickable>
                        <s-link href={`/app/qrcodes/${qrCode.handle}`}>
                          <strong>{truncate(qrCode.title, { length: 28 })}</strong>
                        </s-link>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      {qrCode.productDeleted ? (
                        <s-badge icon="alert-diamond" tone="critical">
                          Product has been deleted
                        </s-badge>
                      ) : (
                        truncate(qrCode.productTitle || "—", { length: 25 })
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-badge tone={qrCode.destination === "cart" ? "success" : "info"}>
                          {qrCode.destination === "cart" ? "Cart Checkout" : "Product Page"}
                        </s-badge>
                        {qrCode.discountCode && (
                          <s-badge tone="attention">
                            🏷️ {qrCode.discountCode}
                          </s-badge>
                        )}
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>{new Date(qrCode.createdAt).toLocaleDateString()}</s-table-cell>
                    <s-table-cell>
                      <strong>{qrCode.scans}</strong>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        </s-section>
      )}
      {/* [END Table] */}

      {/* [START Printable Sticker Modal / Sheet] */}
      {isPrintModalOpen && (
        <div
          className="print-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "900px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              className="no-print"
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e1e3e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f7f8f9",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                  Printable Sticker Sheet ({activeSelectedItems.length} Stickers)
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#616161" }}>
                  Click &quot;Print Now&quot; to print standard labels (grid format suitable for stickers/tags).
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    backgroundColor: "#008060",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  🖨️ Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  style={{
                    backgroundColor: "#e4e5e7",
                    color: "#202223",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Sticker Grid Container */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                backgroundColor: "#f1f2f4",
                flex: 1,
              }}
            >
              <div
                id="printable-labels"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                {activeSelectedItems.map((item) => (
                  <div
                    key={item.handle}
                    className="label-sticker-card"
                    style={{
                      border: "1.5px dashed #b0b4b8",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "center",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      breakInside: "avoid",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <div style={{ width: "100%", marginBottom: "8px" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#202223",
                          lineHeight: "1.2",
                          marginBottom: "4px",
                        }}
                      >
                        {truncate(item.title || "Product", { length: 24 })}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6d7175",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.productTitle || "Shopify Product"}
                      </div>
                    </div>

                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{
                          width: "140px",
                          height: "140px",
                          objectFit: "contain",
                          margin: "6px 0",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "140px",
                          height: "140px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#f6f6f7",
                          color: "#8c9196",
                          fontSize: "12px",
                        }}
                      >
                        No QR Image
                      </div>
                    )}

                    <div style={{ width: "100%", marginTop: "6px" }}>
                      {item.discountCode ? (
                        <div
                          style={{
                            display: "inline-block",
                            backgroundColor: "#ffd200",
                            color: "#303030",
                            fontWeight: "700",
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            marginBottom: "4px",
                          }}
                        >
                          🏷️ CODE: {item.discountCode}
                        </div>
                      ) : null}
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#008060",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.destination === "cart" ? "Scan to Buy Directly" : "Scan for Details"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Print Styling */}
      <style>{`
        @media print {
          /* Hide everything in the body except the printable labels modal container */
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .print-modal-overlay {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
          }
          .print-modal-overlay > div {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
          }
          #printable-labels, #printable-labels * {
            visibility: visible !important;
          }
          #printable-labels {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12mm !important;
            padding: 10mm !important;
            background: #ffffff !important;
          }
          .label-sticker-card {
            border: 1px dashed #999999 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding: 12px !important;
          }
        }
      `}</style>
      {/* [END Printable Sticker Modal] */}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
