const { getPagination } = require("../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboardData = async (req, res) => {
  try {
    //==================================Ventes vs bénéfices===============================================
    // get all sale invoice by group
    const allSaleInvoice = await prisma.saleInvoice.groupBy({
      orderBy: {
        date: "asc"
      },
      by: ["date"],
      where: {
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        }
      },
      _sum: {
        total_amount: true,
        paid_amount: true,
        due_amount: true,
        profit: true
      },
      _count: {
        id: true
      }
    });
    // format response data for data visualization chart in antd
    const formattedData1 = allSaleInvoice.map((item) => {
      return {
        type: "Ventes",
        date: item.date.toISOString().split("T")[0],
        amount: item._sum.total_amount
      };
    });
    const formattedData2 = allSaleInvoice.map((item) => {
      return {
        type: "Profits",
        date: item.date.toISOString().split("T")[0],
        amount: item._sum.profit
      };
    });
    const formattedData3 = allSaleInvoice.map((item) => {
      return {
        type: "nombre de facture",
        date: item.date.toISOString().split("T")[0],
        amount: item._count.id
      };
    });
    // concat formatted data
    const saleProfitCount = formattedData1
      .concat(formattedData2)
      .concat(formattedData3);
    //==================================Ventes Spa et Ventes Btq===============================================
    // get all customer due amount
    const salesInfoSpa = await prisma.saleInvoice.aggregate({
      _count: {
        id: true
      },
      _sum: {
        total_amount: true
      },
      where: {
        customer: {
          role: "Centre Thérapeutique"
        },
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        },
        type_saleInvoice: "produit_fini"
      }
    });
    const salesInfoBtq = await prisma.saleInvoice.aggregate({
      _count: {
        id: true
      },
      _sum: {
        total_amount: true
      },
      where: {
        customer: {
          role: {
            in: ["Particulier", "Professionnel"]
          }
        },
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        },
        type_saleInvoice: "produit_fini"
      }
    });
    // format response data for data visualization chart in antd
    const formattedData4 = [
      {
        type: "ventes Centre Thérapeutique",
        value: Number(salesInfoSpa._sum.total_amount)
      }
    ];
    const formattedData5 = [
      { type: "ventes Boutique", value: Number(salesInfoBtq._sum.total_amount) }
    ];
    const SupplierVSCustomer = formattedData4.concat(formattedData5);

    //==================================customerSaleProfit===============================================
    // get all sale invoice by group
    const allSaleInvoiceByGroup = await prisma.saleInvoice.groupBy({
      by: ["customer_id"],
      _sum: {
        total_amount: true,
        profit: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          total_amount: "desc" // Tri décroissant par total_amount
        }
      },
      where: {
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        },
        type_saleInvoice: "produit_fini"
      }
    });
    // format response data for data visualization chart in antdantd
    const formattedData6 = await Promise.all(
      allSaleInvoiceByGroup.map(async (item) => {
        const customer = await prisma.customer.findUnique({
          where: { id: item.customer_id }
        });
        const formattedData = {
          label: customer.username,
          type: "ventes",
          value: item._sum.total_amount
        };
        return formattedData;
      })
    );
    const formattedData7 = await Promise.all(
      allSaleInvoiceByGroup.map(async (item) => {
        const customer = await prisma.customer.findUnique({
          where: { id: item.customer_id }
        });
        return {
          label: customer.username,
          type: "Profits",
          value: item._sum.profit
        };
      })
    );
    // concat formatted data
    const customerSaleProfit = [...formattedData6, ...formattedData7].sort(
      (a, b) => {
        a.value - b.value;
      }
    );
    //==========================================================================================================
    //========================================Produits les Plus vendus==========================================
    // Étape 1 : Obtenir les prix totaux vendus pour tous les produits
    const totalQuantity = await prisma.saleInvoiceProduct.aggregate({
      _sum: {
        product_sale_price: true
      },
      where: {
        invoice: {
          date: {
            gte: new Date(req.query.startdate),
            lte: new Date(req.query.enddate)
          }
        },
        product: { type_product: "Produit fini" }
      }
    });

    const totalQuantitySold = totalQuantity._sum.product_sale_price;

    // Étape 2 : Obtenir les produits les plus vendus
    const topSellingProducts = await prisma.saleInvoiceProduct.groupBy({
      by: ["product_id"],
      where: {
        invoice: {
          date: {
            gte: new Date(req.query.startdate),
            lte: new Date(req.query.enddate)
          }
        },
        product: { type_product: "Produit fini" }
      },
      _sum: { product_sale_price: true },
      orderBy: { _sum: { product_sale_price: "desc" } },
      take: 5
    });

    const productDetails = await prisma.product.findMany({
      where: { id: { in: topSellingProducts.map((p) => p.product_id) } }
    });

    const productsWithQuantities = productDetails.map((product) => {
      const productData = topSellingProducts.find(
        (p) => p.product_id === product.id
      );
      return {
        ...product,
        quantitySold: productData._sum.product_sale_price
      };
    });

    // Étape 3 : Calculer les pourcentages
    const productsWithPercentages = productsWithQuantities.map((product) => {
      const percentage = (
        (product.quantitySold / totalQuantitySold) *
        100
      ).toFixed(2);
      return {
        ...product,
        percentageSold: parseFloat(percentage)
      };
    });

    // Étape 4 : Sélectionner les 4 produits avec les pourcentages les plus élevés
    const top4Products = productsWithPercentages
      .sort((a, b) => b.percentageSold - a.percentageSold)
      .slice(0, 4);

    

    //=========================================================================================
    //==================================cardInfo===============================================
    const purchaseInfo = await prisma.purchaseInvoice.aggregate({
      _count: {
        id: true
      },
      _sum: {
        total_amount: true,
        due_amount: true,
        paid_amount: true
      },
      where: {
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        }
      }
    });
    const saleInfo = await prisma.saleInvoice.aggregate({
      _count: {
        id: true
      },
      _sum: {
        total_amount: true,
        due_amount: true,
        paid_amount: true,
        profit: true
      },
      where: {
        date: {
          gte: new Date(req.query.startdate),
          lte: new Date(req.query.enddate)
        },
        type_saleInvoice: "produit_fini"
      }
    });
    // concat 2 object
    const cardInfo = {
      purchase_count: purchaseInfo._count.id,
      purchase_total: Number(purchaseInfo._sum.total_amount),
      sale_count: saleInfo._count.id,
      sale_total: Number(saleInfo._sum.total_amount),
      sale_profit: Number(saleInfo._sum.profit)
    };

    res.json({
      saleProfitCount,
      SupplierVSCustomer,
      customerSaleProfit,
      cardInfo,
      top4Products
    });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  getDashboardData
};
