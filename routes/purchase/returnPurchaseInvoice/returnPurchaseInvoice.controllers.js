const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSingleReturnPurchaseInvoice = async (req, res) => {
  // calculate total purchase price
  let totalPurchasePrice = 0;
  req.body.returnPurchaseInvoiceProduct.forEach((item) => {
    totalPurchasePrice +=
      parseFloat(item.product_purchase_price) *
      parseFloat(item.product_quantity);
  });
  try {
    // ============ DUE AMOUNT CALCULATION START==============================================
    // get single purchase invoice information with products
    const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
      where: {
        id: Number(req.body.purchaseInvoice_id),
      },
    });
    // transactions of the paid amount
    const transactions2 = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        related_id: Number(req.body.purchaseInvoice_id),
        OR: [
          {
            credit_id: 1,
          },
          {
            credit_id: 2,
          },
        ],
      },
    });
    // transactions of the discount earned amount
    const transactions3 = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        related_id: Number(req.body.purchaseInvoice_id),
        credit_id: 13,
      },
    });
    // transactions of the return purchase invoice's amount
    const transactions4 = await prisma.transaction.findMany({
      where: {
        type: "purchase_return",
        related_id: Number(req.body.purchaseInvoice_id),
        OR: [
          {
            debit_id: 1,
          },
          {
            debit_id: 2,
          },
        ],
      },
    });
    // get return purchase invoice information with products of this purchase invoice
    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
      where: {
        purchaseInvoice_id: Number(req.body.purchaseInvoice_id),
      },
      include: {
        returnPurchaseInvoiceProduct: {
          include: {
            product: true,
          },
        },
      },
    });
    // sum of total paid amount
    const totalPaidAmount = transactions2.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // sum of total discount earned amount
    const totalDiscountAmount = transactions3.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // sum of total return purchase invoice amount
    const paidAmountReturn = transactions4.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    // sum total amount of all return purchase invoice related to this purchase invoice
    const totalReturnAmount = returnPurchaseInvoice.reduce(
      (acc, item) => acc + item.total_amount,
      0
    );
    console.log(singlePurchaseInvoice.total_amount);
    console.log(singlePurchaseInvoice.discount);
    console.log(totalPaidAmount);
    console.log(totalDiscountAmount);
    console.log(totalReturnAmount);
    console.log(paidAmountReturn);
    const dueAmount =
      singlePurchaseInvoice.total_amount -
      singlePurchaseInvoice.discount -
      totalPaidAmount -
      totalDiscountAmount -
      totalReturnAmount +
      paidAmountReturn;
    console.log(dueAmount);
    // ============ DUE AMOUNT CALCULATION END===============================================
    // convert all incoming data to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    // create return purchase invoice
    const createdReturnPurchaseInvoice =
      await prisma.returnPurchaseInvoice.create({
        data: {
          date: new Date(date),
          total_amount: totalPurchasePrice,
          purchaseInvoice: {
            connect: {
              id: Number(req.body.purchaseInvoice_id),
            },
          },
          note: req.body.note,
          // map and save all products from request body array of products to database
          returnPurchaseInvoiceProduct: {
            create: req.body.returnPurchaseInvoiceProduct.map((product) => ({
              product: {
                connect: {
                  id: Number(product.product_id),
                },
              },
              product_quantity: Number(product.product_quantity),
              product_purchase_price: parseFloat(
                product.product_purchase_price
              ),
            })),
          },
        },
      });

    // receive payment from supplier on return purchase transaction create
    if (dueAmount >= totalPurchasePrice) {
      // TODO: dynamic debit id like bank, cash, etc
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 5,
          credit_id: 3,
          amount: parseFloat(totalPurchasePrice),
          particulars: `Account payable (due) reduced on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${req.body.purchaseInvoice_id}`,
          type: "purchase_return",
          related_id: Number(req.body.purchaseInvoice_id),
        },
      });
    }
    if (dueAmount < totalPurchasePrice) {
      // TODO: dynamic debit id like bank, cash, etc
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 5,
          credit_id: 3,
          amount: parseFloat(dueAmount),
          particulars: `Account payable (due) reduced on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${req.body.purchaseInvoice_id}`,
          type: "purchase_return",
          related_id: Number(req.body.purchaseInvoice_id),
        },
      });
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 1,
          credit_id: 3,
          amount: parseFloat(totalPurchasePrice - dueAmount),
          particulars: `Cash receive on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${req.body.purchaseInvoice_id}`,
          type: "purchase_return",
          related_id: Number(req.body.purchaseInvoice_id),
        },
      });
    }
    // iterate through all products of this return purchase invoice and less the product quantity,
    req.body.returnPurchaseInvoiceProduct.forEach(async (item) => {
      await prisma.product.update({
        where: {
          id: Number(item.product_id),
        },
        data: {
          quantity: {
            decrement: Number(item.product_quantity),
          },
        },
      });
    }),
      res.json({
        createdReturnPurchaseInvoice,
      });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};
const getAllReturnPurchaseInvoice = async (req, res) => {
  if (req.query.query === "info") {
    // get purchase invoice info
    const aggregations = await prisma.returnPurchaseInvoice.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        total_amount: true,
      },
    });
    res.json(aggregations);
  } else if (req.query.query === "all") {
    try {
      // get all purchase invoice
      const allPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
        include: {
          purchaseInvoice: true,
        },
      });
      res.json(allPurchaseInvoice);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "group") {
    try {
      // get all purchase invoice
      const allPurchaseInvoice = await prisma.returnPurchaseInvoice.groupBy({
        orderBy: {
          date: "asc",
        },
        by: ["date"],
        _sum: {
          total_amount: true,
        },
        _count: {
          id: true,
        },
      });
      res.json(allPurchaseInvoice);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      const [aggregations, allPurchaseInvoice] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.returnPurchaseInvoice.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            total_amount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: false,
          },
        }),
        // get returnPurchaseInvoice paginated and by start and end date
        prisma.returnPurchaseInvoice.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          include: {
            purchaseInvoice: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: false,
          },
        }),
      ]);
      res.json({ aggregations, allPurchaseInvoice });
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get purchase invoice with pagination and info
      const [aggregations, allPurchaseInvoice] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.returnPurchaseInvoice.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            total_amount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: true,
          },
        }),
        // get returnPurchaseInvoice paginated and by start and end date
        prisma.returnPurchaseInvoice.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          include: {
            purchaseInvoice: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: true,
          },
        }),
      ]);
      res.json({ aggregations, allPurchaseInvoice });
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleReturnPurchaseInvoice = async (req, res) => {
  try {
    const singleProduct = await prisma.returnPurchaseInvoice.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        returnPurchaseInvoiceProduct: {
          include: {
            product: true,
          },
        },
        purchaseInvoice: true,
      },
    });
    res.json(singleProduct);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// TODO: update purchase invoice: NO UPDATE ALLOWED FOR NOW
const updateSingleReturnPurchaseInvoice = async (req, res) => {
  try {
    const updatedProduct = await prisma.returnPurchaseInvoice.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        name: req.body.name,
        quantity: Number(req.body.quantity),
        purchase_price: Number(req.body.purchase_price),
        sale_price: Number(req.body.sale_price),
        note: req.body.note,
      },
    });
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// on delete purchase invoice, decrease product quantity, supplier due amount decrease, transaction create
const deleteSingleReturnPurchaseInvoice = async (req, res) => {
  try {
    // get purchase invoice details
    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findUnique(
      {
        where: {
          id: Number(req.params.id),
        },
        include: {
          returnPurchaseInvoiceProduct: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      }
    );
    // product quantity decrease
    returnPurchaseInvoice.returnPurchaseInvoiceProduct.forEach(async (item) => {
      await prisma.product.update({
        where: {
          id: Number(item.product_id),
        },
        data: {
          quantity: {
            decrement: Number(item.product_quantity),
          },
        },
      });
    });
    // all operations in one transaction
    const [deletePurchaseInvoice, supplier, transaction] =
      await prisma.$transaction([
        // purchase invoice delete
        prisma.returnPurchaseInvoice.update({
          where: {
            id: Number(req.params.id),
          },
          data: {
            status: req.body.status,
          },
        }),
        // supplier due amount decrease
        // prisma.supplier.update({
        // 	where: {
        // 		id: Number(returnPurchaseInvoice.supplier_id),
        // 	},
        // 	data: {
        // 		due_amount: {
        // 			decrement: Number(returnPurchaseInvoice.due_amount),
        // 		},
        // 	},
        // }),
        // new transaction will be created
        // prisma.transaction.create({
        // 	data: {
        // 		date: new Date(),
        // 		type: "purchase_deleted",
        // 		related_id: Number(req.params.id),
        // 		amount: parseFloat(returnPurchaseInvoice.paid_amount),
        // 		particulars: "paid amount refunded",
        // 	},
        // }),
      ]);
    res.json({
      deletePurchaseInvoice,
      // supplier,
      // transaction,
    });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleReturnPurchaseInvoice,
  getAllReturnPurchaseInvoice,
  getSingleReturnPurchaseInvoice,
  updateSingleReturnPurchaseInvoice,
  deleteSingleReturnPurchaseInvoice,
};
