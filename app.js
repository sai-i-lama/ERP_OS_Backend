const rateLimit = require("express-rate-limit");
const compression = require("compression");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const paymentPurchaseInvoiceRoutes = require("./routes/purchase/paymentPurchaseInvoice/paymentPurchaseInvoice.routes");
const paymentSaleInvoiceRoutes = require("./routes/sale/paymentSaleInvoice/paymentSaleInvoice.routes");
const returnSaleInvoiceRoutes = require("./routes/sale/returnSaleInvoice/returnSaleInvoice.routes");
const purchaseInvoiceRoutes = require("./routes/purchase/purchaseInvoice/purchaseInvoice.routes");
const returnPurchaseInvoiceRoutes = require("./routes/purchase/returnPurchaseInvoice/returnPurchaseInvoice.routes");
const rolePermissionRoutes = require("./routes/hr/rolePermission/rolePermission.routes");
const saleInvoiceRoutes = require("./routes/sale/saleInvoice/saleInvoice.routes");
const transactionRoutes = require("./routes/accounting/transaction/transaction.routes");
const permissionRoutes = require("./routes/hr/permission/permission.routes");
const dashboardRoutes = require("./routes/dashboard/dashboard.routes");
const customerRoutes = require("./routes/sale/customer/customer.routes");
const supplierRoutes = require("./routes/purchase/supplier/supplier.routes");
const {
  productRoutes,
  productImageRoutes,
} = require("./routes/inventory/product/product.routes");
const userRoutes = require("./routes/user/user.routes");
const roleRoutes = require("./routes/hr/role/role.routes");
const designationRoutes = require("./routes/hr/designation/designation.routes");
const productCategoryRoutes = require("./routes/inventory/productCategory/productCategory.routes");
const accountRoutes = require("./routes/accounting/account/account.routes");
const settingRoutes = require("./routes/setting/setting.routes");

/* variables */
// express app instance
const app = express();

// holds all the allowed origins for cors access
let allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
];

// limit the number of requests from a single IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  standardHeaders: false, // Disable rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/* Middleware */
// for compressing the response body
app.use(compression());
// helmet: secure express app by setting various HTTP headers. And serve cross origin resources.
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
// morgan: log requests to console in dev environment
app.use(morgan("dev"));
// allows cors access from allowedOrigins array
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

// parse requests of content-type - application/json
app.use(express.json({ extended: true }));

/* Routes */
app.use("/v1/payment-purchase-invoice", paymentPurchaseInvoiceRoutes);
app.use("/v1/payment-sale-invoice", paymentSaleInvoiceRoutes);
app.use("/v1/purchase-invoice", purchaseInvoiceRoutes);
app.use("/v1/return-purchase-invoice", returnPurchaseInvoiceRoutes);
app.use("/v1/role-permission", rolePermissionRoutes);
app.use("/v1/sale-invoice", saleInvoiceRoutes);
app.use("/v1/return-sale-invoice", returnSaleInvoiceRoutes);
app.use("/v1/transaction", transactionRoutes);
app.use("/v1/permission", permissionRoutes);
app.use("/v1/dashboard", dashboardRoutes);
app.use("/v1/user", limiter, userRoutes);
app.use("/v1/customer", customerRoutes);
app.use("/v1/supplier", supplierRoutes);
app.use("/v1/product", productRoutes);
app.use("/v1/product-image", productImageRoutes);
app.use("/v1/role", roleRoutes);
app.use("/v1/designation", designationRoutes);
app.use("/v1/product-category", productCategoryRoutes);
app.use("/v1/account", accountRoutes);
app.use("/v1/setting", settingRoutes);

module.exports = app;
