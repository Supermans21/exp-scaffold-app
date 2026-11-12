import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
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
    shop: session.shop,
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
  const { qrCodes, shop } = useLoaderData();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'cart' | 'product' | 'discount'
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Selection State for Bulk Actions
  const [selectedHandles, setSelectedHandles] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Quick tab counts
  const tabCounts = useMemo(() => {
    return {
      all: qrCodes.length,
      cart: qrCodes.filter((qr) => qr.destination === "cart").length,
      product: qrCodes.filter((qr) => qr.destination === "product").length,
      discount: qrCodes.filter((qr) => qr.discountCode && qr.discountCode.trim()).length,
    };
  }, [qrCodes]);

  // Handle Quick Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "all") {
      setDestinationFilter("all");
      setDiscountFilter("all");
    } else if (tab === "cart") {
      setDestinationFilter("cart");
      setDiscountFilter("all");
    } else if (tab === "product") {
      setDestinationFilter("product");
      setDiscountFilter("all");
    } else if (tab === "discount") {
      setDestinationFilter("all");
      setDiscountFilter("with_discount");
    }
  };

  // Filter & Sort Logic
  const filteredQRCodes = useMemo(() => {
    return qrCodes
      .filter((qr) => {
        // Search by QR title or Product title
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = qr.title?.toLowerCase().includes(q);
          const matchProduct = qr.productTitle?.toLowerCase().includes(q);
          const matchDiscount = qr.discountCode?.toLowerCase().includes(q);
          if (!matchTitle && !matchProduct && !matchDiscount) return false;
        }

        // Filter by destination
        if (destinationFilter !== "all") {
          if (qr.destination !== destinationFilter) return false;
        }

        // Filter by discount code presence
        if (discountFilter === "with_discount") {
          if (!qr.discountCode || !qr.discountCode.trim()) return false;
        } else if (discountFilter === "no_discount") {
          if (qr.discountCode && qr.discountCode.trim()) return false;
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

  // Download Single PNG
  const handleDownloadSinglePng = (qr) => {
    if (!qr.image) return;
    const link = document.createElement("a");
    link.href = qr.image;
    const fileName = `${qr.title ? qr.title.replace(/[^a-z0-9_-]/gi, "_") : qr.handle}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setDestinationFilter("all");
    setDiscountFilter("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    destinationFilter !== "all" ||
    discountFilter !== "all" ||
    sortBy !== "newest";

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

      {/* [START Polaris Custom Table & Filter Card] */}
      <div className="polaris-card">
        {/* Quick Views / Segmented Tabs */}
        <div className="polaris-tabs-bar">
          <button
            type="button"
            className={`polaris-tab-item ${activeTab === "all" ? "active" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All
            <span className="tab-badge">{tabCounts.all}</span>
          </button>
          <button
            type="button"
            className={`polaris-tab-item ${activeTab === "cart" ? "active" : ""}`}
            onClick={() => handleTabChange("cart")}
          >
            Cart Checkout
            <span className="tab-badge">{tabCounts.cart}</span>
          </button>
          <button
            type="button"
            className={`polaris-tab-item ${activeTab === "product" ? "active" : ""}`}
            onClick={() => handleTabChange("product")}
          >
            Product Page
            <span className="tab-badge">{tabCounts.product}</span>
          </button>
          <button
            type="button"
            className={`polaris-tab-item ${activeTab === "discount" ? "active" : ""}`}
            onClick={() => handleTabChange("discount")}
          >
            🏷️ With Discount
            <span className="tab-badge">{tabCounts.discount}</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="filter-controls-row">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              viewBox="0 0 20 20"
              focusable="false"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M14.293 13.293a6 6 0 1 0-1.414 1.414l3.707 3.707a1 1 0 0 0 1.414-1.414l-3.707-3.707zm-5.293 1.707a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
              />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, product or discount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Destination Dropdown */}
          <div className="select-wrapper">
            <select
              aria-label="Filter by destination"
              value={destinationFilter}
              onChange={(e) => {
                setDestinationFilter(e.target.value);
                setActiveTab(
                  e.target.value === "cart"
                    ? "cart"
                    : e.target.value === "product"
                    ? "product"
                    : "all"
                );
              }}
            >
              <option value="all">Destination: All</option>
              <option value="cart">Cart / Checkout</option>
              <option value="product">Product Page</option>
            </select>
            <svg className="select-arrow" viewBox="0 0 20 20">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Discount Dropdown */}
          <div className="select-wrapper">
            <select
              aria-label="Filter by discount"
              value={discountFilter}
              onChange={(e) => {
                setDiscountFilter(e.target.value);
                if (e.target.value === "with_discount") setActiveTab("discount");
              }}
            >
              <option value="all">Discount: All</option>
              <option value="with_discount">With Discount</option>
              <option value="no_discount">Without Discount</option>
            </select>
            <svg className="select-arrow" viewBox="0 0 20 20">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Sort By Dropdown */}
          <div className="select-wrapper">
            <select
              aria-label="Sort QR codes"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="scans_desc">Sort: Most Scans</option>
              <option value="title_asc">Sort: Title (A-Z)</option>
            </select>
            <svg className="select-arrow" viewBox="0 0 20 20">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Action & Summary Bar */}
        <div className="action-summary-row">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {selectedHandles.length > 0 ? (
              <span style={{ fontWeight: "600", color: "#008060" }}>
                ✓ {selectedHandles.length} of {filteredQRCodes.length} selected
              </span>
            ) : (
              <span style={{ color: "#616161" }}>
                Showing <strong>{filteredQRCodes.length}</strong> of <strong>{qrCodes.length}</strong> QR code{qrCodes.length === 1 ? "" : "s"}
              </span>
            )}

            {selectedHandles.length > 0 && (
              <button
                type="button"
                className="btn-polaris-tertiary"
                onClick={() => setSelectedHandles([])}
              >
                Deselect all
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-polaris-tertiary"
                onClick={clearFilters}
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-group">
            <button
              type="button"
              className="btn-polaris-secondary"
              onClick={handleDownloadZip}
              disabled={filteredQRCodes.length === 0 || isExporting}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 3a.75.75 0 0 0-1.5 0v8.69L6.53 8.97a.75.75 0 0 0-1.06 1.06l4 4a.75.75 0 0 0 1.06 0l4-4a.75.75 0 1 0-1.06-1.06l-2.72 2.72V3z" />
                <path d="M3.5 15.25a.75.75 0 0 0 0 1.5h13a.75.75 0 0 0 0-1.5h-13z" />
              </svg>
              {isExporting ? "Exporting..." : `Download ZIP (${selectedHandles.length > 0 ? selectedHandles.length : "All"})`}
            </button>

            <button
              type="button"
              className="btn-polaris-secondary"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={filteredQRCodes.length === 0}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4.5a1.5 1.5 0 0 1 1.5-1.5h7a1.5 1.5 0 0 1 1.5 1.5V6h-10V4.5zm11 3h-12a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1v-2.5a1.5 1.5 0 0 1 1.5-1.5h7a1.5 1.5 0 0 1 1.5 1.5V15.5h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2zm-3 5.5v3.5H7V13h6z" />
              </svg>
              Print Stickers ({selectedHandles.length > 0 ? selectedHandles.length : "All"})
            </button>
          </div>
        </div>

        {/* Data Table or Empty Result */}
        {filteredQRCodes.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#202223" }}>
              No QR codes found
            </h3>
            <p style={{ fontSize: "14px", color: "#616161", marginBottom: "16px" }}>
              Try adjusting your search terms or filters to find what you are looking for.
            </p>
            <button
              type="button"
              className="btn-polaris-secondary"
              onClick={clearFilters}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="polaris-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      aria-label="Select all QR codes"
                      className="table-checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>QR Code & Title</th>
                  <th>Linked Product</th>
                  <th>Destination</th>
                  <th>Discount Code</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: "center" }}>Scans</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQRCodes.map((qrCode) => {
                  const isSelected = selectedHandles.includes(qrCode.handle);
                  return (
                    <tr key={qrCode.handle} className={isSelected ? "selected" : ""}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${qrCode.title}`}
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(qrCode.handle)}
                        />
                      </td>

                      {/* QR Thumbnail & Title */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Link
                            to={`/app/qrcodes/${qrCode.handle}`}
                            className="qr-thumb-box"
                            title="Click to view/edit QR Code"
                          >
                            {qrCode.image ? (
                              <img
                                src={qrCode.image}
                                alt={qrCode.title}
                                style={{ width: "36px", height: "36px", objectFit: "contain" }}
                              />
                            ) : (
                              <span style={{ fontSize: "10px", color: "#8c9196" }}>QR</span>
                            )}
                          </Link>
                          <div>
                            <Link to={`/app/qrcodes/${qrCode.handle}`} className="qr-title-link">
                              {truncate(qrCode.title || "Untitled QR Code", { length: 32 })}
                            </Link>
                            <div style={{ fontSize: "11px", color: "#8c9196", marginTop: "2px" }}>
                              {qrCode.handle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product */}
                      <td>
                        {qrCode.productDeleted ? (
                          <span className="badge-pill badge-critical">
                            ⚠️ Product Deleted
                          </span>
                        ) : (
                          <span title={qrCode.productTitle} style={{ fontWeight: "500" }}>
                            {truncate(qrCode.productTitle || "—", { length: 28 })}
                          </span>
                        )}
                      </td>

                      {/* Destination */}
                      <td>
                        {qrCode.destination === "cart" ? (
                          <span className="badge-pill badge-green">
                            🛒 Cart Checkout
                          </span>
                        ) : (
                          <span className="badge-pill badge-blue">
                            📦 Product Page
                          </span>
                        )}
                      </td>

                      {/* Discount Code */}
                      <td>
                        {qrCode.discountCode && qrCode.discountCode.trim() ? (
                          <span className="badge-pill badge-amber">
                            🏷️ {qrCode.discountCode}
                          </span>
                        ) : (
                          <span style={{ color: "#8c9196", paddingLeft: "8px" }}>—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ color: "#616161", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(qrCode.createdAt).toLocaleDateString()}
                      </td>

                      {/* Scans */}
                      <td style={{ textAlign: "center" }}>
                        <span className="scans-count">{qrCode.scans}</span>
                      </td>

                      {/* Quick Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-polaris-secondary"
                            style={{ height: "28px", padding: "0 8px", fontSize: "12px" }}
                            onClick={() => handleDownloadSinglePng(qrCode)}
                            title="Download single PNG"
                          >
                            PNG
                          </button>
                          <Link
                            to={`/app/qrcodes/${qrCode.handle}`}
                            className="btn-polaris-secondary"
                            style={{ height: "28px", padding: "0 8px", fontSize: "12px", textDecoration: "none" }}
                          >
                            Edit
                          </Link>
                          <a
                            href={`/qrcodes/${qrCode.handle}/scan?shop=${shop}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-polaris-secondary"
                            style={{ height: "28px", padding: "0 8px", fontSize: "12px", textDecoration: "none", color: "#008060" }}
                            title="Test scan destination link"
                          >
                            Test ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* [END Polaris Custom Table & Filter Card] */}

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
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#202223" }}>
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

      {/* Embedded CSS for Polaris Styling & Print */}
      <style>{`
        /* Card container */
        .polaris-card {
          background: #ffffff;
          border: 1px solid #e1e3e5;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          margin-top: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* Tabs */
        .polaris-tabs-bar {
          display: flex;
          align-items: center;
          border-bottom: 1px solid #e1e3e5;
          padding: 0 12px;
          background: #ffffff;
          gap: 4px;
          overflow-x: auto;
        }

        .polaris-tab-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #616161;
          background: none;
          border: none;
          border-bottom: 2.5px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .polaris-tab-item:hover {
          color: #202223;
        }

        .polaris-tab-item.active {
          color: #202223;
          font-weight: 600;
          border-bottom-color: #008060;
        }

        .tab-badge {
          background: #f1f2f4;
          color: #616161;
          padding: 2px 7px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .polaris-tab-item.active .tab-badge {
          background: #e4f8ed;
          color: #0f6f43;
        }

        /* Filter controls row */
        .filter-controls-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid #e1e3e5;
          background: #ffffff;
        }

        .search-input-wrapper {
          flex: 1 1 260px;
          min-width: 220px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          width: 16px;
          height: 16px;
          fill: #616161;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 36px;
          padding: 0 32px 0 36px;
          font-size: 13px;
          color: #202223;
          background: #ffffff;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .search-input:focus {
          border-color: #008060;
          box-shadow: 0 0 0 1px #008060;
        }

        .search-clear-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #8c9196;
          font-size: 14px;
          cursor: pointer;
          padding: 2px;
          line-height: 1;
        }

        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-wrapper select {
          appearance: none;
          -webkit-appearance: none;
          height: 36px;
          padding: 0 30px 0 12px;
          font-size: 13px;
          font-weight: 500;
          color: #202223;
          background: #ffffff;
          border: 1px solid #c9cccf;
          border-radius: 8px;
          cursor: pointer;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }

        .select-wrapper select:hover {
          background-color: #f9fafb;
        }

        .select-wrapper select:focus {
          border-color: #008060;
          box-shadow: 0 0 0 1px #008060;
        }

        .select-arrow {
          position: absolute;
          right: 10px;
          pointer-events: none;
          width: 12px;
          height: 12px;
          color: #616161;
        }

        /* Action & summary row */
        .action-summary-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: #fafbfb;
          border-bottom: 1px solid #e1e3e5;
          font-size: 13px;
        }

        .action-buttons-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-polaris-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          background: #ffffff;
          border: 1px solid #c9cccf;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #202223;
          cursor: pointer;
          box-sizing: border-box;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .btn-polaris-secondary:hover:not(:disabled) {
          background: #f6f6f7;
          border-color: #b0b4b8;
        }

        .btn-polaris-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-polaris-tertiary {
          background: none;
          border: none;
          color: #2c6ecb;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 6px;
          text-decoration: underline;
        }

        .btn-polaris-tertiary:hover {
          color: #1f4f89;
        }

        /* Badges */
        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.2;
        }

        .badge-green {
          background: #e4f8ed;
          color: #0f6f43;
          border: 1px solid #b7ecd0;
        }

        .badge-blue {
          background: #eaf4fd;
          color: #0e5b99;
          border: 1px solid #b8def9;
        }

        .badge-amber {
          background: #fef4e6;
          color: #8c5b05;
          border: 1px solid #f9dcab;
        }

        .badge-critical {
          background: #fedfe0;
          color: #8e1f0b;
          border: 1px solid #f9b8b8;
        }

        /* Table */
        .polaris-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .polaris-table th {
          background: #f7f8f9;
          font-size: 12px;
          font-weight: 600;
          color: #5c5f62;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 16px;
          border-bottom: 1px solid #e1e3e5;
          white-space: nowrap;
        }

        .polaris-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e1e3e5;
          font-size: 13px;
          color: #202223;
          vertical-align: middle;
        }

        .polaris-table tr:hover td {
          background: #f9fafb;
        }

        .polaris-table tr.selected td {
          background: #f1f7f5;
        }

        .table-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #008060;
          vertical-align: middle;
        }

        .qr-thumb-box {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          border: 1px solid #e1e3e5;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          flex-shrink: 0;
        }

        .qr-title-link {
          color: #202223;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
        }

        .qr-title-link:hover {
          color: #008060;
          text-decoration: underline;
        }

        .scans-count {
          display: inline-block;
          min-width: 28px;
          padding: 2px 8px;
          background: #f1f2f4;
          border-radius: 12px;
          font-weight: 700;
          font-size: 12px;
          text-align: center;
          color: #202223;
        }

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
