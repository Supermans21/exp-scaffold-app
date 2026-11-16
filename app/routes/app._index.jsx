import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import JSZip from "jszip";

import { authenticate } from "../shopify.server";
import { getQRCodes } from "../models/QRCode.server";
import indexStylesUrl from "../styles/app-index.css?url";

export const links = () => [{ rel: "stylesheet", href: indexStylesUrl }];

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

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatCreatedDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return UTC_DATE_FORMATTER.format(date);
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
                        {formatCreatedDate(qrCode.createdAt)}
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

      {/* [END Printable Sticker Modal] */}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
