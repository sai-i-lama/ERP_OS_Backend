const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSingleSaleInvoice = async (req, res) => {
  try {
    // calculate total sale price
    let totalSalePrice = 0;
    req.body.saleInvoiceProduct.forEach((item) => {
      totalSalePrice +=
        parseFloat(item.product_sale_price) * parseFloat(item.product_quantity);
    });
    // get all product asynchronously
    const allProduct = await Promise.all(
      req.body.saleInvoiceProduct.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: {
            id: item.product_id,
          },
        });
        return product;
      })
    );
    // iterate over all product and calculate total purchase price
    totalPurchasePrice = 0;
    req.body.saleInvoiceProduct.forEach((item, index) => {
      totalPurchasePrice +=
        allProduct[index].purchase_price * item.product_quantity;
    });
    // convert all incoming date to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    // create sale invoice
    const createdInvoice = await prisma.saleInvoice.create({
      data: {
        date: new Date(date),
        total_amount: totalSalePrice,
        discount: parseFloat(req.body.discount),
        paid_amount: parseFloat(req.body.paid_amount),
        profit:
          totalSalePrice - parseFloat(req.body.discount) - totalPurchasePrice,
        due_amount:
          totalSalePrice -
          parseFloat(req.body.discount) -
          parseFloat(req.body.paid_amount),
        customer: {
          connect: {
            id: Number(req.body.customer_id),
          },
        },
        user: {
          connect: {
            id: Number(req.body.user_id),
          },
        },
        note: req.body.note,
        // map and save all products from request body array of products
        saleInvoiceProduct: {
          create: req.body.saleInvoiceProduct.map((product) => ({
            product: {
              connect: {
                id: Number(product.product_id),
              },
            },
            product_quantity: Number(product.product_quantity),
            product_sale_price: parseFloat(product.product_sale_price),
          })),
        },
      },
    });
    // new transactions will be created as journal entry for paid amount
    if (req.body.paid_amount > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 1,
          credit_id: 8,
          amount: parseFloat(req.body.paid_amount),
          particulars: `Cash receive on Sale Invoice #${createdInvoice.id}`,
          type: "sale",
          related_id: createdInvoice.id,
        },
      });
    }
    // if sale on due another transactions will be created as journal entry
    const due_amount =
      totalSalePrice -
      parseFloat(req.body.discount) -
      parseFloat(req.body.paid_amount);
    // console.log(due_amount);
    if (due_amount > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debit_id: 4,
          credit_id: 8,
          amount: due_amount,
          particulars: `Due on Sale Invoice #${createdInvoice.id}`,
          type: "sale",
          related_id: createdInvoice.id,
        },
      });
    }
    // cost of sales will be created as journal entry
    await prisma.transaction.create({
      data: {
        date: new Date(date),
        debit_id: 9,
        credit_id: 3,
        amount: totalPurchasePrice,
        particulars: `Cost of sales on Sale Invoice #${createdInvoice.id}`,
        type: "sale",
        related_id: createdInvoice.id,
      },
    });
    // iterate through all products of this sale invoice and decrease product quantity
    req.body.saleInvoiceProduct.forEach(async (item) => {
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
        createdInvoice,
      });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const getAllSaleInvoice = async (req, res) => {
  if (req.query.query === "info") {
    const aggregations = await prisma.saleInvoice.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        total_amount: true,
        discount: true,
        due_amount: true,
        paid_amount: true,
        profit: true,
      },
    });
    res.json(aggregations);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      let aggregations, saleInvoices;
      if (req.query.user) {
        if (req.query.count) {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true,
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true,
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
                user_id: Number(req.query.user),
              },
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc",
                },
              ],
              skip: Number(skip),
              take: Number(limit),
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true,
                  },
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
                user_id: Number(req.query.user),
              },
            }),
          ]);
        } else {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true,
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true,
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
                user_id: Number(req.query.user),
              },
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc",
                },
              ],
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true,
                  },
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
                user_id: Number(req.query.user),
              },
            }),
          ]);
        }
      } else {
        if (req.query.count) {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true,
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true,
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
              },
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc",
                },
              ],
              skip: Number(skip),
              take: Number(limit),
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true,
                  },
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
              },
            }),
          ]);
        } else {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true,
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true,
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
              },
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc",
                },
              ],
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true,
                  },
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate),
                },
              },
            }),
          ]);
        }
      }
      // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
      const transactions = await prisma.transaction.findMany({
        where: {
          type: "sale",
          related_id: {
            in: saleInvoices.map((item) => item.id),
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
      });
      // the return that paid back to customer on return invoice
      const transactions2 = await prisma.transaction.findMany({
        where: {
          type: "sale_return",
          related_id: {
            in: saleInvoices.map((item) => item.id),
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
      });
      // calculate the discount given amount at the time of make the payment
      const transactions3 = await prisma.transaction.findMany({
        where: {
          type: "sale",
          related_id: {
            in: saleInvoices.map((item) => item.id),
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
      const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
        where: {
          saleInvoice_id: {
            in: saleInvoices.map((item) => item.id),
          },
        },
      });
      // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
      const allSaleInvoice = saleInvoices.map((item) => {
        const paidAmount = transactions
          .filter((transaction) => transaction.related_id === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const paidAmountReturn = transactions2
          .filter((transaction) => transaction.related_id === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const discountGiven = transactions3
          .filter((transaction) => transaction.related_id === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const returnAmount = returnSaleInvoice
          .filter(
            (returnSaleInvoice) => returnSaleInvoice.saleInvoice_id === item.id
          )
          .reduce((acc, curr) => acc + curr.total_amount, 0);
        const totalUnitMeasurement = item.saleInvoiceProduct.reduce(
          (acc, curr) =>
            acc +
            Number(curr.product.unit_measurement) *
              Number(curr.product_quantity),
          0
        );
        return {
          ...item,
          paid_amount: paidAmount,
          discount: item.discount + discountGiven,
          due_amount:
            item.total_amount -
            item.discount -
            paidAmount -
            returnAmount +
            paidAmountReturn -
            discountGiven,
          total_unit_measurement: totalUnitMeasurement,
        };
      });
      // calculate total paid_amount and due_amount from allSaleInvoice and attach it to aggregations
      const totalPaidAmount = allSaleInvoice.reduce(
        (acc, curr) => acc + curr.paid_amount,
        0
      );
      const totalDueAmount = allSaleInvoice.reduce(
        (acc, curr) => acc + curr.due_amount,
        0
      );
      const totalUnitMeasurement = allSaleInvoice.reduce(
        (acc, curr) => acc + curr.total_unit_measurement,
        0
      );
      const totalUnitQuantity = allSaleInvoice
        .map((item) =>
          item.saleInvoiceProduct.map((item) => item.product_quantity)
        )
        .flat()
        .reduce((acc, curr) => acc + curr, 0);
      const totalDiscountGiven = allSaleInvoice.reduce(
        (acc, curr) => acc + curr.discount,
        0
      );

      aggregations._sum.paid_amount = totalPaidAmount;
      aggregations._sum.discount = totalDiscountGiven;
      aggregations._sum.due_amount = totalDueAmount;
      aggregations._sum.total_unit_measurement = totalUnitMeasurement;
      aggregations._sum.total_unit_quantity = totalUnitQuantity;
      res.json({
        aggregations,
        allSaleInvoice,
      });
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleSaleInvoice = async (req, res) => {
  try {
    const singleSaleInvoice = await prisma.saleInvoice.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        saleInvoiceProduct: {
          include: {
            product: true,
          },
        },
        customer: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    // view the transactions of the sale invoice
    const transactions = await prisma.transaction.findMany({
      where: {
        related_id: Number(req.params.id),
        OR: [
          {
            type: "sale",
          },
          {
            type: "sale_return",
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
    // transactions of the paid amount
    const transactions2 = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: Number(req.params.id),
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
    // for total return amount
    const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
      where: {
        saleInvoice_id: Number(req.params.id),
      },
      include: {
        returnSaleInvoiceProduct: {
          include: {
            product: true,
          },
        },
      },
    });
    // calculate the discount given amount at the time of make the payment
    const transactions3 = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: Number(req.params.id),
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
    // calculate the total amount return back to customer for return sale invoice from transactions
    // transactions of the paid amount
    const transactions4 = await prisma.transaction.findMany({
      where: {
        type: "sale_return",
        related_id: Number(req.params.id),
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
    const paidAmountReturn = transactions4.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    let status = "UNPAID";
    // sum total amount of all transactions
    const totalPaidAmount = transactions2.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // sum of total discount given amount at the time of make the payment
    const totalDiscountAmount = transactions3.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // check if total transaction amount is equal to total_amount - discount - return invoice amount
    const totalReturnAmount = returnSaleInvoice.reduce(
      (acc, item) => acc + item.total_amount,
      0
    );
    console.log(singleSaleInvoice.total_amount);
    console.log(singleSaleInvoice.discount);
    console.log(totalPaidAmount);
    console.log(totalDiscountAmount);
    console.log(totalReturnAmount);
    console.log(paidAmountReturn);
    const dueAmount =
      singleSaleInvoice.total_amount -
      singleSaleInvoice.discount -
      totalPaidAmount -
      totalDiscountAmount -
      totalReturnAmount +
      paidAmountReturn;
    if (dueAmount === 0) {
      status = "PAID";
    }
    // calculate total unit_measurement
    const totalUnitMeasurement = singleSaleInvoice.saleInvoiceProduct.reduce(
      (acc, item) =>
        acc + Number(item.product.unit_measurement) * item.product_quantity,
      0
    );
    // console.log(totalUnitMeasurement);
    res.json({
      status,
      totalPaidAmount,
      totalReturnAmount,
      dueAmount,
      totalUnitMeasurement,
      singleSaleInvoice,
      returnSaleInvoice,
      transactions,
    });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleSaleInvoice,
  getAllSaleInvoice,
  getSingleSaleInvoice,
};
