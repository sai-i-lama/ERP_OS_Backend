const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSinglePaymentSaleInvoice = async (req, res) => {
  try {
    // convert all incoming data to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    // received paid amount against sale invoice using a transaction
    const transaction1 = await prisma.transaction.create({
      data: {
        date: new Date(date),
        debit_id: 1,
        credit_id: 4,
        amount: parseFloat(req.body.amount),
        particulars: `Received payment of Sale Invoice #${req.body.sale_invoice_no}`,
        type: "sale",
        related_id: parseInt(req.body.sale_invoice_no),
      },
    });
    // discount given using a transaction
    let transaction2;
    if (req.body.discount > 0) {
      transaction2 = await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 14,
          credit_id: 4,
          amount: parseFloat(req.body.discount),
          particulars: `Discount given of Sale Invoice #${req.body.sale_invoice_no}`,
          type: "sale",
          related_id: parseInt(req.body.sale_invoice_no),
        },
      });
    }
    // decrease sale invoice profit by discount value
    const saleInvoice = await prisma.saleInvoice.update({
      where: {
        id: parseInt(req.body.sale_invoice_no),
      },
      data: {
        profit: {
          decrement: parseFloat(req.body.discount),
        },
      },
    });
    res.status(200).json({ transaction1, transaction2 });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const getAllPaymentSaleInvoice = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allPaymentSaleInvoice = await prisma.transaction.findMany({
        where: {
          type: "payment_sale_invoice",
        },
        orderBy: {
          id: "desc",
        },
      });
      res.json(allPaymentSaleInvoice);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "info") {
    const aggregations = await prisma.transaction.aggregate({
      where: {
        type: "payment_sale_invoice",
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });
    res.json(aggregations);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allPaymentSaleInvoice = await prisma.transaction.findMany({
        where: {
          type: "payment_sale_invoice",
        },
        orderBy: {
          id: "desc",
        },
        skip: Number(skip),
        take: Number(limit),
      });
      res.json(allPaymentSaleInvoice);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

// const getSingleSupplier = async (req, res) => {
//   try {
//     const singleSupplier = await prisma.supplier.findUnique({
//       where: {
//         id: Number(req.params.id),
//       },
//       include: {
//         saleInvoice: true,
//       },
//     });
//     res.json(singleSupplier);
//   } catch (error) {
//     res.status(400).json(error.message);
//     console.log(error.message);
//   }
// };

// const updateSingleSupplier = async (req, res) => {
//   try {
//     const updatedSupplier = await prisma.supplier.update({
//       where: {
//         id: Number(req.params.id),
//       },
//       data: {
//         name: req.body.name,
//         phone: req.body.phone,
//         address: req.body.address,
//         due_amount: Number(req.body.due_amount),
//       },
//     });
//     res.json(updatedSupplier);
//   } catch (error) {
//     res.status(400).json(error.message);
//     console.log(error.message);
//   }
// };

// const deleteSingleSupplier = async (req, res) => {
//   try {
//     const deletedSupplier = await prisma.supplier.delete({
//       where: {
//         id: Number(req.params.id),
//       },
//     });
//     res.json(deletedSupplier);
//   } catch (error) {
//     res.status(400).json(error.message);
//     console.log(error.message);
//   }
// };

module.exports = {
  createSinglePaymentSaleInvoice,
  getAllPaymentSaleInvoice,
  // getSinglePaymentSupplier,
  // updateSinglePaymentSupplier,
  // deleteSinglePaymentSupplier,
};
