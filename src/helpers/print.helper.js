import moment from "moment";
import RNPrint from "react-native-print";

import { getVendorOrderTotal } from "./order.helper";
import { getOrderItemDetailLines } from "./orderItemDetails.helper";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getItemName = (item) =>
  item?.menuItem?.name || item?.name || item?.fullMenuItemData?.name || "Item";

const getItemNotes = (item) => getOrderItemDetailLines(item);

const getCustomerName = (order) => {
  const firstName = order?.user?.firstName || order?.customer?.firstName || "";
  const lastName = order?.user?.lastName || order?.customer?.lastName || "";
  const name = `${firstName} ${lastName}`.trim();
  return name || "Guest";
};

const renderOrderHtml = (order) => {
  const items = order?.items || [];
  const orderNumber = order?.orderNumber || order?._id || "";
  const fulfillment = order?.fulfillmentType || "PICKUP";
  const vendorTotal = getVendorOrderTotal(order);
  const vendorTip = Number(order?.tipsAmount || 0);

  return `
    <section class="ticket">
      <div class="ticket-header">
        <h1>Order #${escapeHtml(orderNumber)}</h1>
        <div class="status">${escapeHtml(order?.orderStatus || "")}</div>
      </div>
      <div class="meta">
        <div><strong>Customer:</strong> ${escapeHtml(getCustomerName(order))}</div>
        <div><strong>Type:</strong> ${escapeHtml(fulfillment)}</div>
        <div><strong>Placed:</strong> ${escapeHtml(moment(order?.createdAt).format("MMM D, YYYY h:mm A"))}</div>
        ${order?.pickupTime ? `<div><strong>Prep:</strong> ${escapeHtml(order.pickupTime)} min</div>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>Qty</th>
            <th>Item</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const notes = getItemNotes(item);
              return `
                <tr>
                  <td>${escapeHtml(item?.qty || item?.quantity || 0)}</td>
                  <td>
                    <div class="item-name">${escapeHtml(getItemName(item))}</div>
                    ${
                      notes.length
                        ? `<div class="notes">${notes
                            .map((note) => `<div>${escapeHtml(note)}</div>`)
                            .join("")}</div>`
                        : ""
                    }
                  </td>
                  <td>$${Number(item?.total || 0).toFixed(2)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
      <div class="totals">
        ${vendorTip > 0 ? `<div><span>Vendor tip</span><strong>$${vendorTip.toFixed(2)}</strong></div>` : ""}
        <div><span>Vendor total</span><strong>$${vendorTotal.toFixed(2)}</strong></div>
      </div>
    </section>
  `;
};

const buildPrintHtml = (orders) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          margin: 0;
          padding: 16px;
        }
        .ticket {
          page-break-after: always;
          padding-bottom: 20px;
          border-bottom: 1px dashed #999;
        }
        .ticket:last-child {
          page-break-after: auto;
          border-bottom: 0;
        }
        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        h1 {
          font-size: 24px;
          margin: 0 0 8px;
        }
        .status {
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .meta {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th, td {
          border-top: 1px solid #ddd;
          padding: 8px 4px;
          text-align: left;
          vertical-align: top;
        }
        th:last-child,
        td:last-child {
          text-align: right;
        }
        .item-name {
          font-weight: bold;
        }
        .notes {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.4;
        }
        .totals {
          margin-top: 14px;
          font-size: 14px;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }
      </style>
    </head>
    <body>
      ${orders.map(renderOrderHtml).join("")}
    </body>
  </html>
`;

export const printOrderTickets = async (orders) => {
  const orderList = Array.isArray(orders) ? orders : [orders];
  const printableOrders = orderList.filter(Boolean);

  if (!printableOrders.length) {
    throw new Error("No orders available to print.");
  }

  await RNPrint.print({
    html: buildPrintHtml(printableOrders),
    jobName:
      printableOrders.length === 1
        ? `RTC Order ${printableOrders[0]?.orderNumber || ""}`.trim()
        : `RTC Orders ${printableOrders.length}`,
  });
};

const operationalTitle = (type) => ({
  INVENTORY: "Inventory",
  OPENING_CHECKLIST: "Opening Checklist",
  CLOSING_CHECKLIST: "Closing Checklist",
}[type] || "Operations Form");

const operationalRows = (form) => {
  if (form?.form_type === "INVENTORY") {
    return (form.inventory_items || []).map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.item_name)}</td>
        <td>${escapeHtml(item.brand)}</td>
        <td>${escapeHtml(item.item_location)}</td>
        <td>${escapeHtml(item.purchased_from)}</td>
        <td>${escapeHtml(item.beginning_quantity)}</td>
        <td>${escapeHtml(item.current_quantity)}</td>
        <td>${escapeHtml(item.max_quantity)}</td>
        <td>${escapeHtml(item.reorder_quantity)}</td>
        <td>${escapeHtml(item.notes)}</td>
      </tr>`).join("");
  }
  return (form?.checklist_items || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.completed ? "Yes" : "No"}</td>
      <td>${escapeHtml(item.area)}</td>
      <td>${escapeHtml(item.task)}</td>
      <td>${escapeHtml(item.notes)}</td>
    </tr>`).join("");
};

export const printOperationalComplianceForm = async (form) => {
  if (!form) throw new Error("No operations form is available to print.");
  const inventory = form.form_type === "INVENTORY";
  const date = form.form_date ? moment(form.form_date).format("MMM D, YYYY") : "";
  const html = `<!doctype html>
    <html><head><meta charset="utf-8" /><style>
      body { color:#111; font-family:Arial,Helvetica,sans-serif; padding:18px; }
      h1 { margin:0 0 6px; } .meta { line-height:1.6; margin:14px 0 18px; }
      table { border-collapse:collapse; font-size:${inventory ? "9px" : "12px"}; width:100%; }
      th,td { border:1px solid #bbb; padding:6px; text-align:left; vertical-align:top; }
      th { background:#eee; } .status { font-size:12px; font-weight:bold; text-transform:uppercase; }
    </style></head><body>
      <h1>${escapeHtml(operationalTitle(form.form_type))}</h1>
      <div class="status">${escapeHtml(form.status || "DRAFT")}</div>
      <div class="meta">
        <div><strong>Employee / Vendor Name:</strong> ${escapeHtml(form.prepared_by_name)}</div>
        ${form.initials ? `<div><strong>Initials:</strong> ${escapeHtml(form.initials)}</div>` : ""}
        <div><strong>Date:</strong> ${escapeHtml(date)}</div>
        ${form.truck_unit ? `<div><strong>Truck / Unit:</strong> ${escapeHtml(form.truck_unit)}</div>` : ""}
      </div>
      <table><thead><tr>${inventory
        ? "<th>#</th><th>Item</th><th>Brand</th><th>Location</th><th>Purchased From</th><th>Beginning</th><th>Current</th><th>Max</th><th>Reorder</th><th>Notes</th>"
        : "<th>#</th><th>Complete</th><th>Area</th><th>Task</th><th>Notes</th>"
      }</tr></thead><tbody>${operationalRows(form)}</tbody></table>
    </body></html>`;
  await RNPrint.print({
    html,
    jobName: `RTC ${operationalTitle(form.form_type)} ${date}`.trim(),
  });
};
