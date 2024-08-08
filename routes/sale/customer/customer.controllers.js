const { getPagination } = require("../../../utils/query");
const { PrismaClient, typCat } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const createSingleCustomer = async (req, res) => {
  const userId = req.user?.id; // Assurez-vous que l'ID utilisateur est récupéré correctement ici

  if (req.query.query === "deletemany") {
    try {
      const deletedAccount = await prisma.customer.deleteMany({
        where: {
          id: {
            in: req.body.map((id) => parseInt(id))
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          action: "DELETE_MANY",
          model: "Customer",
          oldValue: deletedAccount, // Les anciennes valeurs supprimées
          newValue: null,
          userId: userId
        }
      });

      res.json(deletedAccount);
    } catch (error) {
      res.status(400).json({ message: error.message });
      console.log(error.message);
    }
  } else if (req.query.query === "createmany") {
    try {
      const createdCustomers = await prisma.customer.createMany({
        data: req.body.map((customer) => ({
          username: customer.username,
          phone: customer.phone,
          address: customer.address,
          role: customer.role,
          password: customer.password,
          email: customer.email,
          status: customer.status
        })),
        skipDuplicates: true
      });

      await prisma.auditLog.create({
        data: {
          action: "CREATE_MANY",
          model: "Customer",
          oldValue: null,
          newValue: createdCustomers, // Les nouvelles valeurs créées
          userId: userId
        }
      });

      res.json(createdCustomers);
    } catch (error) {
      res.status(400).json({ message: error.message });
      console.log(error.message);
    }
  } else {
    try {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const createdCustomer = await prisma.customer.create({
        data: {
          username: req.body.username,
          phone: req.body.phone,
          address: req.body.address,
          password: hash,
          role: req.body.role,
          email: req.body.email,
          status: req.body.status
        }
      });

      await prisma.auditLog.create({
        data: {
          action: "CREATE",
          model: "Customer",
          oldValue: null,
          newValue: createdCustomer, // Les nouvelles valeurs créées
          userId: userId
        }
      });
      console.log("Created Customer:", createdCustomer);
      console.log("User ID:", userId);

      res.json(createdCustomer);
    } catch (error) {
      res.status(400).json({ message: error.message });
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
          id: "asc"
        },
        include: {
          saleInvoice: true
        }
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
        id: true
      },
      where: {
        status: true
      }
    });
    res.json(aggregations);
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      // get all customer
      const allCustomer = await prisma.customer.findMany({
        orderBy: {
          id: "asc"
        },
        include: {
          saleInvoice: true
        },
        where: {
          status: false
        },
        skip: parseInt(skip),
        take: parseInt(limit)
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
          id: "asc"
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          saleInvoice: true
        },
        where: {
          status: true
        }
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
    const { startdate, enddate } = req.query;

    // Convertir les dates en objets Date si elles sont fournies
    const startDate = startdate ? new Date(startdate) : null;
    const endDate = enddate ? new Date(enddate) : null;

    // Trouver le client avec les factures de vente filtrées par date
    const singleCustomer = await prisma.customer.findUnique({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        saleInvoice: {
          where: {
            date: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate })
            }
          }
        }
      }
    });
    // Récupérer toutes les factures de retour pour le client
    const customersAllInvoice = await prisma.customer.findUnique({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        saleInvoice: {
          include: {
            returnSaleInvoice: {
              where: {
                status: true
              }
            }
          }
        }
      }
    });
    const allSaleInvoiceTotalAmount = await prisma.saleInvoice.aggregate({
      _sum: {
        total_amount: true,
        discount: true
      },
      where: {
        customer_id: parseInt(req.params.id)
      }
    });
    // Calculer le montant total des factures de retour
    const allReturnSaleInvoice = customersAllInvoice.saleInvoice.flatMap(
      (invoice) => invoice.returnSaleInvoice
    );
    const TotalReturnSaleInvoice = allReturnSaleInvoice.reduce(
      (acc, invoice) => acc + invoice.total_amount,
      0
    );

    // Récupérer tous les IDs des factures de vente
    const allSaleInvoiceId = customersAllInvoice.saleInvoice.map(
      (saleInvoice) => saleInvoice.id
    );

    // Récupérer toutes les transactions liées aux factures de vente
    const allSaleTransaction = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: { in: allSaleInvoiceId },
        OR: [{ debit_id: 1 }, { debit_id: 2 }]
      },
      include: {
        debit: { select: { name: true } },
        credit: { select: { name: true } }
      }
    });

    // Récupérer toutes les transactions liées aux factures de retour
    const allReturnSaleTransaction = await prisma.transaction.findMany({
      where: {
        type: "sale_return",
        related_id: { in: allSaleInvoiceId },
        OR: [{ credit_id: 1 }, { credit_id: 2 }]
      },
      include: {
        debit: { select: { name: true } },
        credit: { select: { name: true } }
      }
    });

    // Calculer le montant total des paiements
    const totalPaidAmount = allSaleTransaction.reduce(
      (acc, cur) => acc + cur.amount,
      0
    );
    const paidAmountReturn = allReturnSaleTransaction.reduce(
      (acc, cur) => acc + cur.amount,
      0
    );

    // Calculer le montant total des remises données
    const discountGiven = await prisma.transaction.findMany({
      where: {
        type: "sale",
        related_id: { in: allSaleInvoiceId },
        debit_id: 14
      },
      include: {
        debit: { select: { name: true } },
        credit: { select: { name: true } }
      }
    });
    const totalDiscountGiven = discountGiven.reduce(
      (acc, cur) => acc + cur.amount,
      0
    );

    // Calculer le montant dû
    const due_amount =
      parseFloat(allSaleInvoiceTotalAmount._sum.total_amount) -
      parseFloat(allSaleInvoiceTotalAmount._sum.discount) -
      parseFloat(totalPaidAmount) -
      parseFloat(totalDiscountGiven) -
      parseFloat(TotalReturnSaleInvoice) +
      parseFloat(paidAmountReturn);

    singleCustomer.due_amount = due_amount || 0;
    singleCustomer.allReturnSaleInvoice = allReturnSaleInvoice;
    singleCustomer.allTransaction = allSaleTransaction;

    // Mettre à jour les informations des factures de vente du client
    const updatedInvoices = await Promise.all(
      singleCustomer.saleInvoice.map(async (item) => {
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
            singleDiscountGiven
        };
      })
    );

    // Inclure les valeurs agrégées dans la réponse
    singleCustomer.saleCus_count = singleCustomer.saleInvoice.length;
    singleCustomer.saleCus_total_amount = singleCustomer.saleInvoice.reduce(
      (acc, curr) => acc + curr.total_amount,
      0
    );
    singleCustomer.saleCus_due_amount = due_amount || 0;
    singleCustomer.saleCus_paid_amount = totalPaidAmount;

    singleCustomer.saleInvoice = updatedInvoices;

    res.json(singleCustomer);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSingleCustomer = async (req, res) => {
  try {
    // Créer l'utilisateur associé au client avec les mêmes informations
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    // const updateUser = await prisma.user.update({
    //   where: {
    //     id: Number(req.params.id)
    //   },
    //   data: {
    //     username: req.body.name,
    //     password: hash,
    //     role: req.body.type_customer,
    //     email: req.body.email,
    //     id_no: req.body.id_no,
    //     phone: req.body.phone,
    //     address: req.body.address,
    //     image: req.body.image,
    //     status: req.body.status
    //   }
    // });
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: parseInt(req.params.id)
      },
      data: {
        username: req.body.username,
        phone: req.body.phone,
        address: req.body.address,
        password: hash,
        role: req.body.type_customer,
        email: req.body.email,
        status: req.body.status
      }
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
        id: parseInt(req.params.id)
      },
      data: {
        status: req.body.status
      }
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
  deleteSingleCustomer
  // loginCustomer
};
