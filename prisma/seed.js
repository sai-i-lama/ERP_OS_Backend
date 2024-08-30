const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const saltRounds = 10;

// const endpoints = [
//   "paymentPurchaseInvoice",
//   "paymentSaleInvoice",
//   "returnSaleInvoice",
//   "purchaseInvoice",
//   "returnPurchaseInvoice",
//   "rolePermission",
//   "saleInvoice",
//   "transaction",
//   "permission",
//   "dashboard",
//   "customer",
//   "supplier",
//   "product",
//   "user",
//   "role",
//   "designation",
//   "productCategory",
//   "account",
//   "setting",
// ];

// const permissionTypes = ["create", "read", "update", "delete"];

// create permissions for each endpoint by combining permission type and endpoint name
// const permissions = endpoints.reduce((acc, cur) => {
//   const permission = permissionTypes.map((type) => {
//     return `${type}-${cur}`;
//   });
//   return [...acc, ...permission];
// }, []);

// console.log("permissions", permissions, permissions.length);

const permissions = [
  "createProduct",
  "viewProduct",
  "updateProduct",
  "deleteProduct",

  // "createCustomer",
  "viewCustomer",
  "updateCustomer",
  "deleteCustomer",

  "createSupplier",
  "viewSupplier",
  "updateSupplier",
  "deleteSupplier",

  "createTransaction",
  "viewTransaction",
  "updateTransaction",
  "deleteTransaction",

  "createSaleInvoice",
  "viewSaleInvoice",
  "updateSaleInvoice",
  "deleteSaleInvoice",
  "chekSaleInvoice",

  "createPurchaseInvoice",
  "viewPurchaseInvoice",
  "updatePurchaseInvoice",
  "deletePurchaseInvoice",

  "createPaymentPurchaseInvoice",
  "viewPaymentPurchaseInvoice",
  "updatePaymentPurchaseInvoice",
  "deletePaymentPurchaseInvoice",

  "createPaymentSaleInvoice",
  "viewPaymentSaleInvoice",
  "updatePaymentSaleInvoice",
  "deletePaymentSaleInvoice",

  "createRole",
  "viewRole",
  "updateRole",
  "deleteRole",

  "createRolePermission",
  "viewRolePermission",
  "updateRolePermission",
  "deleteRolePermission",

  // "createUser",
  "viewUser",
  "updateUser",
  "deleteUser",
  "professionalUser",
  "viewDashboard",

  "viewPermission",

  "createDesignation",
  "viewDesignation",
  "updateDesignation",
  "deleteDesignation",

  "createProductCategory",
  "viewProductCategory",
  "updateProductCategory",
  "deleteProductCategory",

  "createReturnPurchaseInvoice",
  "viewReturnPurchaseInvoice",
  "updateReturnPurchaseInvoice",
  "deleteReturnPurchaseInvoice",

  "createReturnSaleInvoice",
  "viewReturnSaleInvoice",
  "updateReturnSaleInvoice",
  "deleteReturnSaleInvoice",

  "updateSetting",
  "viewSetting",
];

const roles = ["admin", "staff", "Professionnel","Particulier"];

const accounts = [
  { name: "Asset", type: "Asset" },
  { name: "Liability", type: "Liability" },
  { name: "Capital", type: "Owner's Equity" },
  { name: "Withdrawal", type: "Owner's Equity" },
  { name: "Revenue", type: "Owner's Equity" },
  { name: "Expense", type: "Owner's Equity" },
];

const subAccounts = [
  { account_id: 1, name: "Cash" }, //1
  { account_id: 1, name: "Bank" }, //2
  { account_id: 1, name: "Inventory" }, //3
  { account_id: 1, name: "Accounts Receivable" }, //4
  { account_id: 2, name: "Accounts Payable" }, //5
  { account_id: 3, name: "Capital" }, //6
  { account_id: 4, name: "Withdrawal" }, //7
  { account_id: 5, name: "Sales" }, //8
  { account_id: 6, name: "Cost of Sales" }, //9
  { account_id: 6, name: "Salary" }, //10
  { account_id: 6, name: "Rent" }, //11
  { account_id: 6, name: "Utilities" }, //12
  { account_id: 5, name: "Discount Earned" }, //13
  { account_id: 6, name: "Discount Given" }, //14
];

const settings = {
  company_name: "sai i lama",
  address: "Etoa Meki",
  phone: "693972665",
  email: "contact@sai-i-lama.gamil",
  website: "My Website",
  footer: "©2023 sai i lama",
  tag_line: "votre sante est notre priorité",
};

const professionalPermissions = [
  "professionalUser", "viewSaleInvoice", "viewProduct", "viewProductCategory", 
  "viewCustomer", "createSaleInvoice","updateCustomer",
];
const particularPermissions = [
  "professionalUser", "viewSaleInvoice", "viewProduct", "viewProductCategory", 
  "viewCustomer", "createSaleInvoice","updateCustomer"
];

async function main() {
  const adminHash = await bcrypt.hash("admin", saltRounds);
  const staffHash = await bcrypt.hash("staff", saltRounds);

  // Check if admin user exists
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@gmail.com" }
  });

  if (!adminUser) {
    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@gmail.com",
        password: adminHash,
        role: "admin",
        id_no: "saï-0000",
        gender:"Homme"
      },
    });
  }

  // Check if staff user exists
  const staffUser = await prisma.user.findUnique({
    where: { email: "staff@gmail.com" }
  });

  if (!staffUser) {
    await prisma.user.create({
      data: {
        username: "staff",
        email: "staff@gmail.com",
        password: staffHash,
        role: "staff",
        id_no: "saï-0001",
        gender:"Homme"
      },
    });
  }

  // Check and insert permissions
  for (const permission of permissions) {
    const existingPermission = await prisma.permission.findUnique({
      where: { name: permission }
    });
    if (!existingPermission) {
      await prisma.permission.create({
        data: { name: permission }
      });
    }
  }

  // Check and insert roles
  for (const role of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { name: role }
    });
    if (!existingRole) {
      await prisma.role.create({
        data: { name: role }
      });
    }
  }

  // Assign permissions to the admin role
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (adminRole) {
    for (const permission of permissions) {
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          role_id_permission_id: {
            role_id: adminRole.id,
            permission_id: (await prisma.permission.findUnique({ where: { name: permission } })).id
          }
        }
      });
      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            role_id: adminRole.id,
            permission_id: (await prisma.permission.findUnique({ where: { name: permission } })).id
          }
        });
      }
    }
  }

  // Assign specific permissions to the professional role
  const professionalRole = await prisma.role.findUnique({ where: { name: "Professionnel" } });
  if (professionalRole) {
    for (const permission of professionalPermissions) {
      const permissionId = (await prisma.permission.findUnique({ where: { name: permission } })).id;
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          role_id_permission_id: {
            role_id: professionalRole.id,
            permission_id: permissionId
          }
        }
      });
      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            role_id: professionalRole.id,
            permission_id: permissionId
          }
        });
      }
    }
  }


   // Assign specific permissions to the professional role
   const particularRole = await prisma.role.findUnique({ where: { name: "Particulier" } });
   if (particularRole) {
     for (const permission of particularPermissions) {
       const permissionId = (await prisma.permission.findUnique({ where: { name: permission } })).id;
       const existingRolePermission = await prisma.rolePermission.findUnique({
         where: {
           role_id_permission_id: {
             role_id: particularRole.id,
             permission_id: permissionId
           }
         }
       });
       if (!existingRolePermission) {
         await prisma.rolePermission.create({
           data: {
             role_id: particularRole.id,
             permission_id: permissionId
           }
         });
       }
     }
   }

  // Check and insert accounts
  for (const account of accounts) {
    const existingAccount = await prisma.account.findUnique({
      where: { name: account.name }
    });
    if (!existingAccount) {
      await prisma.account.create({
        data: account
      });
    }
  }

  // Check and insert subAccounts
  for (const subAccount of subAccounts) {
    const existingSubAccount = await prisma.subAccount.findUnique({
      where: { name: subAccount.name }
    });
    if (!existingSubAccount) {
      await prisma.subAccount.create({
        data: subAccount
      });
    }
  }

  // Check and insert settings
  const existingSetting = await prisma.appSetting.findFirst({
    where: { company_name: settings.company_name }
  });
  if (!existingSetting) {
    await prisma.appSetting.create({
      data: settings
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
