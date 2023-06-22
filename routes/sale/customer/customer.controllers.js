const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSingleCustomer = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      // delete many customer at once
      const deletedAccount = await prisma.customer.deleteMany({
        where: {
          id: {
            in: req.body.map((id) => parseInt(id)),
          },
        },
      });
      res.json(deletedAccount);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "createmany") {
    try {
      // create many customer from an array of objects
      const createdCustomer = await prisma.customer.createMany({
        data: req.body.map((customer) => {
          return {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
          };
        }),
        skipDuplicates: true,
      });
      res.json(createdCustomer);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    try {
      // create single customer from an object
      const createdCustomer = await prisma.customer.create({
        data: {
          name: req.body.name,
          phone: req.body.phone,
          address: req.body.address,
        },
      });
      res.json(createdCustomer);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getAllCustomer = async (req, res) => {
  if (req.query.query === "all") {
    try {
      // get all customer
      const allCustomer = await prisma.customer.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          saleInvoice: true,
        },
      });
      res.json(allCustomer);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "info") {
    // get all customer info
    const aggregations = await prisma.customer.aggregate({
      _count: {
        id: true,
      },
      where: {
        status: true,
      },
    });
    res.json(aggregations);
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      // get all customer
      const allCustomer = await prisma.customer.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          saleInvoice: true,
        },
        where: {
          status: false,
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });
      res.json(allCustomer);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get all customer paginated
      const allCustomer = await prisma.customer.findMany({
        orderBy: {
          id: "asc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          saleInvoice: true,
        },
        where: {
          status: true,
        },
      });
      res.json(allCustomer);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleCustomer = async (req, res) => {
  try {
    const singleCustomer = await prisma.customer.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        saleInvoice: true,
      },
    });

    // get individual customer's due amount by calculating: sale invoice's total_amount - return sale invoices - transactions
    const allSaleInvoiceTotalAmount = await prisma.saleInvoice.aggregate({
      _sum: {
        total_amount: true,
        discount: true,
      },
      where: {
        customer_id: parseInt(req.params.id),
      },
    });
    // all invoice of a customer with return sale invoice nested
    const customersAllInvoice = await prisma.customer.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        saleInvoice: {
          include: {
            returnSaleInvoice: {
              where: {
                status: true,
              },
            },
          },
        },
      },
    });
    // get all return sale invoice of a customer
    const allReturnSaleInvoice = customersAllInvoice.saleInvoice.map(
      (invoice) => {
        return invoice.returnSaleInvoice;
      }
    );
    // calculate total return sale invoice amount
    const TotalReturnSaleInvoice = allReturnSaleInvoice.reduce(
      (acc, invoice) => {
        const returnSaleInvoiceTotalAmount = invoice.reduce((acc, invoice) => {
          return acc + invoice.total_amount;
        }, 0);
        return acc + returnSaleInvoiceTotalAmount;
      },
      0
    );
    console.log(allReturnSaleInvoice);
    console.log(TotalReturnSaleInvoice);
    // get all saleInvoice id
    const allSaleInvoiceId = customersAllInvoice.saleInvoice.map(
      (saleInvoice) => {
        return saleInvoice.id;
      }
    );
    // get all transactions related to saleInvoice
    const allSaleTransaction = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: {
          in: allSaleInvoiceId,
        },
        OR: [
          {
            debit_id: 1,
          },
          {
            debit_id: 2,
          },
        ],
      },
      include: {
        debit: {
          select: {
            name: true,
          },
        },
        credit: {
          select: {
            name: true,
          },
        },
      },
    });
    // get all transactions related to return saleInvoice
    const allReturnSaleTransaction = await prisma.transaction.findMany({
      where: {
        type: "sale_return",
        related_id: {
          in: allSaleInvoiceId,
        },
        OR: [
          {
            credit_id: 1,
          },
          {
            credit_id: 2,
          },
        ],
      },
      include: {
        debit: {
          select: {
            name: true,
          },
        },
        credit: {
          select: {
            name: true,
          },
        },
      },
    });
    // calculate the discount given amount at the time of make the payment
    const discountGiven = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: {
          in: allSaleInvoiceId,
        },
        debit_id: 14,
      },
      include: {
        debit: {
          select: {
            name: true,
          },
        },
        credit: {
          select: {
            name: true,
          },
        },
      },
    });
    const totalPaidAmount = allSaleTransaction.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    const paidAmountReturn = allReturnSaleTransaction.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    const totalDiscountGiven = discountGiven.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    //get all transactions related to saleInvoiceId
    const allTransaction = await prisma.transaction.findMany({
      where: {
        related_id: {
          in: allSaleInvoiceId,
        },
      },
      include: {
        debit: {
          select: {
            name: true,
          },
        },
        credit: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log("total_amount", allSaleInvoiceTotalAmount._sum.total_amount);
    console.log("discount", allSaleInvoiceTotalAmount._sum.discount);
    console.log("totalPaidAmount", totalPaidAmount);
    console.log("totalDiscountGiven", totalDiscountGiven);
    console.log("TotalReturnSaleInvoice", TotalReturnSaleInvoice);
    console.log("paidAmountReturn", paidAmountReturn);
    const due_amount =
      parseFloat(allSaleInvoiceTotalAmount._sum.total_amount) -
      parseFloat(allSaleInvoiceTotalAmount._sum.discount) -
      parseFloat(totalPaidAmount) -
      parseFloat(totalDiscountGiven) -
      parseFloat(TotalReturnSaleInvoice) +
      parseFloat(paidAmountReturn);
    console.log("due_amount", due_amount);

    // include due_amount in singleCustomer
    singleCustomer.due_amount = due_amount ? due_amount : 0;
    singleCustomer.allReturnSaleInvoice = allReturnSaleInvoice.flat();
    singleCustomer.allTransaction = allTransaction;
    //==================== UPDATE customer's purchase invoice information START====================
    // async is used for not blocking the main thread
    const updatedInvoices = singleCustomer.saleInvoice.map(async (item) => {
      const paidAmount = allSaleTransaction
        .filter((transaction) => transaction.related_id === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const paidAmountReturn = allReturnSaleTransaction
        .filter((transaction) => transaction.related_id === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const singleDiscountGiven = discountGiven
        .filter((transaction) => transaction.related_id === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const returnAmount = allReturnSaleInvoice
        .flat()
        .filter(
          (returnSaleInvoice) => returnSaleInvoice.saleInvoice_id === item.id
        )
        .reduce((acc, curr) => acc + curr.total_amount, 0);
      return {
        ...item,
        paid_amount: paidAmount,
        discount: item.discount + singleDiscountGiven,
        due_amount:
          item.total_amount -
          item.discount -
          paidAmount -
          returnAmount +
          paidAmountReturn -
          singleDiscountGiven,
      };
    });
    singleCustomer.saleInvoice = await Promise.all(updatedInvoices);
    //==================== UPDATE customer's sale invoice information END====================

    res.json(singleCustomer);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSingleCustomer = async (req, res) => {
  try {
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address,
      },
    });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const deleteSingleCustomer = async (req, res) => {
  try {
    const deletedCustomer = await prisma.customer.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        status: req.body.status,
      },
    });
    res.json(deletedCustomer);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleCustomer,
  getAllCustomer,
  getSingleCustomer,
  updateSingleCustomer,
  deleteSingleCustomer,
};
