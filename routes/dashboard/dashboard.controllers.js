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
        },
        type_saleInvoice: "produit_fini"
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
    // Étape 1 : Récupérer toutes les lignes nécessaires
    const saleInvoiceProducts = await prisma.saleInvoiceProduct.findMany({
      where: {
        invoice: {
          date: {
            gte: new Date(req.query.startdate),
            lte: new Date(req.query.enddate)
          }
        },
        product: {
          type_product: "Produit fini"
        }
      },
      select: {
        product_quantity: true,
        product_sale_price: true,
        product_id: true
      }
    });

    // Étape 2 : Calculer la somme totale des ventes (product_quantity * product_sale_price)
    const totalSales = saleInvoiceProducts.reduce((acc, item) => {
      return acc + item.product_quantity * item.product_sale_price;
    }, 0);

    // Étape 3 : Obtenir les produits les plus vendus (en calculant la somme des ventes par produit)
    const salesByProduct = saleInvoiceProducts.reduce((acc, item) => {
      const totalSaleValue = item.product_quantity * item.product_sale_price;

      if (acc[item.product_id]) {
        acc[item.product_id] += totalSaleValue;
      } else {
        acc[item.product_id] = totalSaleValue;
      }

      return acc;
    }, {});

    // Étape 4 : Récupérer les IDs des produits les plus vendus (convertis en entiers)
    const topProductIds = Object.keys(salesByProduct)
      .sort((a, b) => salesByProduct[b] - salesByProduct[a])
      .slice(0, 5)
      .map((id) => parseInt(id, 10)); // Conversion en entier

    // Étape 5 : Récupérer les détails des produits les plus vendus
    const topSellingProducts = await prisma.product.findMany({
      where: {
        id: { in: topProductIds }
      }
    });

    // Étape 6 : Calculer les pourcentages et associer les données
    const productsWithPercentages = topSellingProducts.map((product) => {
      const totalSaleValue = salesByProduct[product.id];
      const percentage = ((totalSaleValue / totalSales) * 100).toFixed(2);

      return {
        ...product,
        totalSaleValue,
        percentageSold: parseFloat(percentage)
      };
    });

    // Étape 7 : Sélectionner les 4 produits avec les pourcentages les plus élevés
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

    // user éffectuant le plus de vente
    const allGenerateSaleInvoiceByGroup = await prisma.saleInvoice.groupBy({
      by: ["userCreatorId"],
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
    // format response data for data visualization chart in antd
    const formattedData8 = await Promise.all(
      allGenerateSaleInvoiceByGroup.map(async (item) => {
        if (item.userCreatorId) {
          const user = await prisma.user.findUnique({
            where: { id: item.userCreatorId }
          });
          return {
            label: user ? user.username : "Unknown User", // Gérer les cas où l'utilisateur n'est pas trouvé
            type: "ventes",
            value: item._sum.total_amount
          };
        }
        return {
          label: "Unknown User", // Si userCreatorId est null
          type: "ventes",
          value: item._sum.total_amount
        };
      })
    );

    const formattedData9 = await Promise.all(
      allGenerateSaleInvoiceByGroup.map(async (item) => {
        if (item.userCreatorId) {
          const user = await prisma.user.findUnique({
            where: { id: item.userCreatorId }
          });
          return {
            label: user ? user.username : "Unknown User",
            type: "Profits",
            value: item._sum.profit
          };
        }
        return {
          label: "Unknown User",
          type: "Profits",
          value: item._sum.profit
        };
      })
    );

    const formattedData10 = await Promise.all(
      allGenerateSaleInvoiceByGroup.map(async (item) => {
        if (item.userCreatorId) {
          const user = await prisma.user.findUnique({
            where: { id: item.userCreatorId }
          });
          return {
            label: user ? user.username : "Unknown User",
            type: "Nombre de ventes",
            value: item._count.id
          };
        }
        return {
          label: "Unknown User",
          type: "Nombre de ventes",
          value: item._count.id
        };
      })
    );

    // concat formatted data
    const userSaleProfit = [
      ...formattedData8,
      ...formattedData9,
      ...formattedData10
    ].sort((a, b) => a.value - b.value);

    res.json({
      saleProfitCount,
      SupplierVSCustomer,
      customerSaleProfit,
      cardInfo,
      userSaleProfit,
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
