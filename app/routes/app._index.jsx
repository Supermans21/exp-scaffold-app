import { useEffect, useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import JSZip from "jszip";

import { authenticate } from "../shopify.server";
import { getQRCodes } from "../models/QRCode.server";
import indexStylesUrl from "../styles/app-index.css?url";

export const links = () => [
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap",
  },
  { rel: "stylesheet", href: indexStylesUrl },
];

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

const SVG_ATTRS = {
  width: 14,
  height: 14,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: { flexShrink: 0 },
};

const APP_ICONS = {
  tag: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <path d="M3.5 10.5V4.5a1 1 0 0 1 1-1h6l6.2 6.2a1.2 1.2 0 0 1 0 1.7l-5.3 5.3a1.2 1.2 0 0 1-1.7 0L3.5 10.5Z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  cart: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <circle cx="8" cy="16" r="1.3" />
      <circle cx="15" cy="16" r="1.3" />
      <path d="M2.5 3.5h2.2l1.8 9.2h9l1.8-6.2H5.6" />
    </svg>
  ),
  box: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Z" />
      <path d="m3.5 6 6.5 3.5L16.5 6M10 9.5v8" />
    </svg>
  ),
  alert: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <path d="M10 3.2 17.2 16H2.8L10 3.2Z" />
      <path d="M10 8v4M10 14.2v.1" />
    </svg>
  ),
  printer: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <path d="M5.5 6.5V3.5h9v3M5.5 14H4a1.5 1.5 0 0 1-1.5-1.5V8.5A1.5 1.5 0 0 1 4 7h12a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 16 14h-1.5" />
      <rect x="5.5" y="11.5" width="9" height="5" rx="0.8" />
    </svg>
  ),
  download: () => (
    <svg aria-hidden="true" {...SVG_ATTRS}>
      <path d="M10 3.5v8.5M6.5 8.5 10 12l3.5-3.5M3.5 16h13" />
    </svg>
  ),
};

function formatCreatedDate(dateString) {
  if (!dateString) return "None";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "None";
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

  useEffect(() => {
    if (!isPrintModalOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPrintModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPrintModalOpen]);

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
            {APP_ICONS.tag()}
            With Discount
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
              aria-label="Search QR codes"
              placeholder="Search by title, product or discount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
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
            <svg className="select-arrow" viewBox="0 0 20 20" aria-hidden="true">
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
            <svg className="select-arrow" viewBox="0 0 20 20" aria-hidden="true">
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
            <svg className="select-arrow" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Action & Summary Bar */}
        <div className="action-summary-row">
          <div className="action-summary-group">
            {selectedHandles.length > 0 ? (
              <span className="qr-selected-summary">
                {selectedHandles.length} of {filteredQRCodes.length} selected
              </span>
            ) : (
              <span className="qr-table-count">
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
              {APP_ICONS.download()}
              {isExporting ? "Exporting..." : `Download ZIP (${selectedHandles.length > 0 ? selectedHandles.length : "All"})`}
            </button>

            <button
              type="button"
              className="btn-polaris-secondary"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={filteredQRCodes.length === 0}
            >
              {APP_ICONS.printer()}
              Print Stickers ({selectedHandles.length > 0 ? selectedHandles.length : "All"})
            </button>
          </div>
        </div>

        {/* Data Table or Empty Result */}
        {filteredQRCodes.length === 0 ? (
          <div className="qr-empty-state">
            <h3 className="qr-empty-title">
              No QR codes found
            </h3>
            <p className="qr-empty-copy">
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
          <div className="qr-table-scroll">
            <table className="polaris-table">
              <thead>
                <tr>
                  <th className="qr-col-checkbox">
                    <input
                      type="checkbox"
                      aria-label="Select all QR codes"
                      className="table-checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>QR Code &amp; Title</th>
                  <th>Linked Product</th>
                  <th>Destination</th>
                  <th>Discount Code</th>
                  <th>Date Created</th>
                  <th className="qr-cell-center">Scans</th>
                  <th className="qr-cell-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQRCodes.map((qrCode) => {
                  const isSelected = selectedHandles.includes(qrCode.handle);
                  return (
                    <tr key={qrCode.handle} className={isSelected ? "selected" : ""}>
                      <td className="qr-cell-center">
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
                        <div className="qr-title-cell">
                          <Link
                            to={`/app/qrcodes/${qrCode.handle}`}
                            className="qr-thumb-box"
                            aria-label={`Edit ${qrCode.title || "QR Code"}`}
                          >
                            {qrCode.image ? (
                              <img
                                src={qrCode.image}
                                alt={qrCode.title}
                                width="36"
                                height="36"
                                className="qr-thumb-img"
                              />
                            ) : (
                              <span className="qr-thumb-fallback">QR</span>
                            )}
                          </Link>
                          <div>
                            <Link to={`/app/qrcodes/${qrCode.handle}`} className="qr-title-link">
                              {truncate(qrCode.title || "Untitled QR Code", { length: 32 })}
                            </Link>
                            <div className="qr-handle-text">
                              {qrCode.handle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Product */}
                      <td>
                        {qrCode.productDeleted ? (
                          <span className="badge-pill badge-critical">
                            {APP_ICONS.alert()}
                            Product Deleted
                          </span>
                        ) : (
                          <span title={qrCode.productTitle} className="qr-product-name">
                            {truncate(qrCode.productTitle || "None", { length: 28 })}
                          </span>
                        )}
                      </td>

                      {/* Destination */}
                      <td>
                        {qrCode.destination === "cart" ? (
                          <span className="badge-pill badge-green">
                            {APP_ICONS.cart()}
                            Cart Checkout
                          </span>
                        ) : (
                          <span className="badge-pill badge-blue">
                            {APP_ICONS.box()}
                            Product Page
                          </span>
                        )}
                      </td>

                      {/* Discount Code */}
                      <td>
                        {qrCode.discountCode && qrCode.discountCode.trim() ? (
                          <span className="badge-pill badge-amber">
                            {APP_ICONS.tag()}
                            {qrCode.discountCode}
                          </span>
                        ) : (
                          <span className="qr-muted-none">None</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="qr-cell-date">
                        {formatCreatedDate(qrCode.createdAt)}
                      </td>

                      {/* Scans */}
                      <td className="qr-cell-center">
                        <span className="scans-count">{qrCode.scans}</span>
                      </td>

                      {/* Quick Actions */}
                      <td className="qr-cell-right">
                        <div className="qr-row-actions">
                          <button
                            type="button"
                            className="btn-polaris-secondary btn-row-action"
                            onClick={() => handleDownloadSinglePng(qrCode)}
                            title="Download single PNG"
                          >
                            PNG
                          </button>
                          <Link
                            to={`/app/qrcodes/${qrCode.handle}`}
                            className="btn-polaris-secondary btn-row-action"
                          >
                            Edit
                          </Link>
                          <a
                            href={`/qrcodes/${qrCode.handle}/scan?shop=${shop}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-polaris-secondary btn-row-action btn-row-action--accent"
                            title="Test scan destination link"
                          >
                            Test
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-modal-title"
        >
          <button
            type="button"
            className="print-modal-backdrop"
            aria-label="Close printable sticker modal"
            onClick={() => setIsPrintModalOpen(false)}
          />
          <div className="print-modal-shell">
            {/* Modal Header */}
            <div className="no-print print-modal-header">
              <div>
                <h3 id="print-modal-title" className="print-modal-title">
                  Printable Sticker Sheet ({activeSelectedItems.length} Stickers)
                </h3>
                <p className="print-modal-subtitle">
                  Click &quot;Print Now&quot; to print standard labels (grid format suitable for stickers or tags).
                </p>
              </div>
              <div className="print-modal-actions">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-print-primary"
                >
                  {APP_ICONS.printer()}
                  Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="btn-print-close"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Sticker Grid Container */}
            <div className="print-modal-body">
              <div id="printable-labels" className="print-labels-grid">
                {activeSelectedItems.map((item) => (
                  <div key={item.handle} className="sticker-sheet-tile">
                    <div className="sticker-tile-head">
                      <div className="sticker-tile-title">
                        {truncate(item.title || "Product", { length: 24 })}
                      </div>
                      <div className="sticker-tile-product">
                        {item.productTitle || "Shopify Product"}
                      </div>
                    </div>

                    {item.image ? (
                      <img
                        src={item.image}
                        width="140"
                        height="140"
                        alt={item.title}
                        className="sticker-tile-qr"
                      />
                    ) : (
                      <div className="sticker-tile-qr-empty">
                        No QR Image
                      </div>
                    )}

                    <div className="sticker-tile-foot">
                      {item.discountCode ? (
                        <div className="sticker-discount-tag">
                          {APP_ICONS.tag()}
                          Code: {item.discountCode}
                        </div>
                      ) : null}
                      <div className="sticker-scan-hint">
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
