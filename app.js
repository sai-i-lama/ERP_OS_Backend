const rateLimit = require("express-rate-limit");
const compression = require("compression");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const mime = require("mime");

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
  productImageRoutes
} = require("./routes/inventory/product/product.routes");
const userRoutes = require("./routes/user/user.routes");
const roleRoutes = require("./routes/hr/role/role.routes");
const designationRoutes = require("./routes/hr/designation/designation.routes");
const productCategoryRoutes = require("./routes/inventory/productCategory/productCategory.routes");
const accountRoutes = require("./routes/accounting/account/account.routes");
const settingRoutes = require("./routes/setting/setting.routes");
const smsRouter = require("./routes/sms/sms.routes");
const getAuditLogs = require("./routes/AuditLog/auditlog.routes");
const { lotProductRoute } = require("./routes/inventory/lotProduct/lotProduct.routes");
/* variables */
// express app instance
const app = express();

// holds all the allowed origins for cors access
let allowedOrigins = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  //"http://localhost",
  //"http://127.0.0.1",

  "http://localhost:3000",
  "http://127.0.0.1:3000",

  "http://127.0.0.1:5000",
  "http://localhost:5000",

  "http://localhost:8000",
  "http://127.0.0.1:8000",

  "http://127.0.0.1:8080",
  "http://localhost:8080",

  "http://127.0.0.1:5500",
  "http://localhost:5500",

  "https://erp-os-frontend.vercel.app",

  "http://192.168.1.176",
  "http://192.168.1.176:8000",
  "http://192.168.1.176:5000",
  "http://192.168.1.176:3001",

  // machine perso
  "http://192.168.1.100:3001",
  "http://192.168.1.100:5000",
  "http://192.168.1.100:8000"
];

// limit the number of requests from a single IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  standardHeaders: false, // Disable rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
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
      // Autoriser les requêtes sans origine (applications mobiles, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Méthodes HTTP autorisées
    allowedHeaders: ["Content-Type", "Authorization"] // En-têtes autorisés
  })
);

// Serve JavaScript files with the correct MIME type
app.use((req, res, next) => {
  if (req.url.endsWith(".js")) {
    res.setHeader("Content-Type", "application/javascript");
  }
  next();
});

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
app.use("/v1/sms", smsRouter);
app.use("/v1/audit-logs", getAuditLogs);
app.use("/v1/lot-product", lotProductRoute);

module.exports = app;
