const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const { notifyUser, notifyAllUsers } = require("../../websocketNotification");
const prisma = new PrismaClient();

const createSingleSaleInvoice = async (req, res) => {
  try {
    // Validate input data
    const {
      customer_id,
      user_id,
      saleInvoiceProduct,
      date,
      discount,
      paid_amount,
      numCommande,
      note,
      type_saleInvoice
    } = req.body;

    if (
      !customer_id ||
      !user_id ||
      !saleInvoiceProduct ||
      !date ||
      !numCommande ||
      !type_saleInvoice
    ) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: Number(customer_id) }
    });
    if (!customer) {
      return res.status(400).json({ error: "Client non trouvé" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: Number(user_id) }
    });
    if (!user) {
      return res.status(400).json({ error: "Utilisateur non trouvé" });
    }

    // Calculate total sale price
    let totalSalePrice = 0;
    saleInvoiceProduct.forEach((item) => {
      totalSalePrice +=
        parseFloat(item.product_sale_price) * parseFloat(item.product_quantity);
    });

    // Get all products asynchronously
    const allProduct = await Promise.all(
      saleInvoiceProduct.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: {
            id: Number(item.product_id)
          }
        });
        if (!product) {
          throw new Error(`Produit avec ID ${item.product_id} non trouvé`);
        }
        return product;
      })
    );

    // Calculate total purchase price
    let totalPurchasePrice = 0;
    saleInvoiceProduct.forEach((item, index) => {
      totalPurchasePrice +=
        allProduct[index].purchase_price * item.product_quantity;
    });

    // Convert date to specific format
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Initialize variables
    let total_amount, due_amount, profit;

    // Determine calculations based on invoice type
    if (type_saleInvoice === "matière_première") {
      total_amount = totalPurchasePrice;
      due_amount = total_amount - parseFloat(discount) - total_amount; // Will be zero or negative
      profit = 0;
    } else if (type_saleInvoice === "produit_fini") {
      total_amount = totalSalePrice;
      profit = totalSalePrice - parseFloat(discount) - totalPurchasePrice;
      due_amount =
        totalSalePrice - parseFloat(discount) - parseFloat(paid_amount);
    } else {
      return res.status(400).json({ error: "Type de facture non valide" });
    }

    // Create sale invoice
    const createdInvoice = await prisma.saleInvoice.create({
      data: {
        date: new Date(formattedDate),
        total_amount: total_amount,
        type_saleInvoice: type_saleInvoice,
        discount: parseFloat(discount),
        paid_amount: parseFloat(paid_amount),
        numCommande: numCommande,
        profit: profit,
        due_amount: due_amount,
        customer: {
          connect: {
            id: Number(customer_id)
          }
        },
        user: {
          connect: {
            id: Number(user_id)
          }
        },
        note: note,
        saleInvoiceProduct: {
          create: saleInvoiceProduct.map((product) => ({
            product: {
              connect: {
                id: Number(product.product_id)
              }
            },
            product_quantity: Number(product.product_quantity),
            product_sale_price: parseFloat(product.product_sale_price) || null,
            product_purchase_price:
              parseFloat(product.product_purchase_price) || null
          }))
        }
      }
    });

    // Create journal entries
    if (parseFloat(paid_amount) > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(formattedDate),
          debit_id: 1,
          credit_id: 8,
          amount: parseFloat(paid_amount),
          particulars: `Cash receive on Sale Invoice #${createdInvoice.id}`,
          type: "sale",
          related_id: createdInvoice.id
        }
      });
    }

    const due_amount_journal =
      totalSalePrice - parseFloat(discount) - parseFloat(paid_amount);
    if (due_amount_journal > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(formattedDate),
          debit_id: 4,
          credit_id: 8,
          amount: due_amount_journal,
          particulars: `Due on Sale Invoice #${createdInvoice.id}`,
          type: "sale",
          related_id: createdInvoice.id
        }
      });
    }

    await prisma.transaction.create({
      data: {
        date: new Date(formattedDate),
        debit_id: 9,
        credit_id: 3,
        amount: totalPurchasePrice,
        particulars: `Cost of sales on Sale Invoice #${createdInvoice.id}`,
        type: "sale",
        related_id: createdInvoice.id
      }
    });

    // Update product quantities
    await Promise.all(
      saleInvoiceProduct.map((item) =>
        prisma.product.update({
          where: {
            id: Number(item.product_id)
          },
          data: {
            quantity: {
              decrement: Number(item.product_quantity)
            }
          }
        })
      )
    );

    if (type_saleInvoice === "produit_fini") {
      notifyAllUsers({
        type: "new_order",
        message: `Nouvelle commande créée avec ID : ${createdInvoice.numCommande}`,
        order: createdInvoice
      });
    }

    console.log(createdInvoice);
    res.json({
      createdInvoice
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.log(error.message);
  }
};

const getAllSaleInvoice = async (req, res) => {
  if (req.query.query === "info") {
    const aggregations = await prisma.saleInvoice.aggregate({
      _count: {
        id: true
      },
      _sum: {
        total_amount: true,
        discount: true,
        due_amount: true,
        paid_amount: true,
        profit: true
      }
    });
    res.json(aggregations);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      let aggregations, saleInvoices;
      if (req.query.user || req.query.customer) {
        if (req.query.count) {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                },
                user_id: Number(req.query.user),
                customer_id: Number(req.query.customer)
              }
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc"
                }
              ],
              skip: Number(skip),
              take: Number(limit),
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true
                  }
                },
                customer: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                },
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                },
                user_id: Number(req.query.user),
                customer_id: Number(req.query.customer)
              }
            })
          ]);
        } else {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                },
                user_id: Number(req.query.user)
              }
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc"
                }
              ],
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true
                  }
                },
                customer: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                },
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                },
                user_id: Number(req.query.user),
                customer_id: Number(req.query.customer)
              }
            })
          ]);
        }
      } else {
        if (req.query.count) {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                }
              }
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc"
                }
              ],
              skip: Number(skip),
              take: Number(limit),
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true
                  }
                },
                customer: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                },
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                }
              }
            })
          ]);
        } else {
          [aggregations, saleInvoices] = await prisma.$transaction([
            // get info of selected parameter data
            prisma.saleInvoice.aggregate({
              _count: {
                id: true
              },
              _sum: {
                total_amount: true,
                discount: true,
                due_amount: true,
                paid_amount: true,
                profit: true
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                }
              }
            }),
            // get saleInvoice paginated and by start and end date
            prisma.saleInvoice.findMany({
              orderBy: [
                {
                  id: "desc"
                }
              ],
              include: {
                saleInvoiceProduct: {
                  include: {
                    product: true
                  }
                },
                customer: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                },
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              },
              where: {
                date: {
                  gte: new Date(req.query.startdate),
                  lte: new Date(req.query.enddate)
                }
              }
            })
          ]);
        }
      }
      // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
      const transactions = await prisma.transaction.findMany({
        where: {
          type: "sale",
          related_id: {
            in: saleInvoices.map((item) => item.id)
          },
          OR: [
            {
              debit_id: 1
            },
            {
              debit_id: 2
            }
          ]
        }
      });
      // the return that paid back to customer on return invoice
      const transactions2 = await prisma.transaction.findMany({
        where: {
          type: "sale_return",
          related_id: {
            in: saleInvoices.map((item) => item.id)
          },
          OR: [
            {
              credit_id: 1
            },
            {
              credit_id: 2
            }
          ]
        }
      });
      // calculate the discount given amount at the time of make the payment
      const transactions3 = await prisma.transaction.findMany({
        where: {
          type: "sale",
          related_id: {
            in: saleInvoices.map((item) => item.id)
          },
          debit_id: 14
        },
        include: {
          debit: {
            select: {
              name: true
            }
          },
          credit: {
            select: {
              name: true
            }
          }
        }
      });
      const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
        where: {
          saleInvoice_id: {
            in: saleInvoices.map((item) => item.id)
          }
        }
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
          total_unit_measurement: totalUnitMeasurement
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
        allSaleInvoice
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
        id: Number(req.params.id)
      },
      include: {
        saleInvoiceProduct: {
          include: {
            product: true
          }
        },
        customer: true,
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    // view the transactions of the sale invoice
    const transactions = await prisma.transaction.findMany({
      where: {
        related_id: Number(req.params.id),
        OR: [
          {
            type: "sale"
          },
          {
            type: "sale_return"
          }
        ]
      },
      include: {
        debit: {
          select: {
            name: true
          }
        },
        credit: {
          select: {
            name: true
          }
        }
      }
    });
    // transactions of the paid amount
    const transactions2 = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: Number(req.params.id),
        OR: [
          {
            debit_id: 1
          },
          {
            debit_id: 2
          }
        ]
      },
      include: {
        debit: {
          select: {
            name: true
          }
        },
        credit: {
          select: {
            name: true
          }
        }
      }
    });
    // for total return amount
    const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
      where: {
        saleInvoice_id: Number(req.params.id)
      },
      include: {
        returnSaleInvoiceProduct: {
          include: {
            product: true
          }
        }
      }
    });
    // calculate the discount given amount at the time of make the payment
    const transactions3 = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: Number(req.params.id),
        debit_id: 14
      },
      include: {
        debit: {
          select: {
            name: true
          }
        },
        credit: {
          select: {
            name: true
          }
        }
      }
    });
    // calculate the total amount return back to customer for return sale invoice from transactions
    // transactions of the paid amount
    const transactions4 = await prisma.transaction.findMany({
      where: {
        type: "sale_return",
        related_id: Number(req.params.id),
        OR: [
          {
            credit_id: 1
          },
          {
            credit_id: 2
          }
        ]
      },
      include: {
        debit: {
          select: {
            name: true
          }
        },
        credit: {
          select: {
            name: true
          }
        }
      }
    });
    const paidAmountReturn = transactions4.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    let status = "INPAYÉ";
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
      status = "PAYÉ";
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
      transactions
    });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSaleInvoice = async (req, res) => {
  const { id } = req.params;
  const { delivred, ready, consumed } = req.body;

  try {
    const updatedInvoice = await prisma.saleInvoice.update({
      where: { id: Number(id) },
      data: {
        ...(delivred !== undefined && { delivred }),
        ...(ready !== undefined && { ready }),
        ...(consumed !== undefined && { consumed })
      },
      include: {
        customer: true // Inclure les informations du client
      }
    });

    // Envoyer une notification au client associé à la commande si elle est prête
    if (ready === true) {
      const clientId = updatedInvoice.customer.id; // Utilisation de l'id du client associé à la commande

      // Envoi de la notification au client
      const client = await prisma.customer.findUnique({
        where: { id: clientId }
      });

      if (client) {
        // Assurez-vous que notifyUser accepte l'identifiant du client
        notifyUser(clientId, {
          type: "update_order",
          message: `Votre commande ${updatedInvoice.numCommande} est prête!`,
          order: updatedInvoice
        });
      }
    }

    // Notifier aussi les utilisateurs/admins
    console.log(updatedInvoice);

    return res.status(200).json({
      message: "Facture mise à jour avec succès",
      data: updatedInvoice
    });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la facture :",
      error.message
    );
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSingleSaleInvoice,
  getAllSaleInvoice,
  getSingleSaleInvoice,
  updateSaleInvoice
};
