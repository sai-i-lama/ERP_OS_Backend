const { getPagination } = require("../../../utils/query");
const { PrismaClient, typCat } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const transporter = require("../../mailer"); // Importez le transporteur Nodemailer

const createSingleCustomer = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      const deletedAccount = await prisma.customer.deleteMany({
        where: {
          id: {
            in: req.body.map((id) => parseInt(id))
          }
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
          status: customer.status,
          sku: customer.sku
        })),
        skipDuplicates: true
      });

      res.json(createdCustomers);
    } catch (error) {
      res.status(400).json({ message: error.message });
      console.log(error.message);
    }
  } else {
    try {
      // Vérifier si l'email existe déjà dans la base de données
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: req.body.email }
      });

      if (existingCustomer) {
        return res.status(400).json({ message: "L'email existe déjà." });
      }

      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const createdCustomer = await prisma.customer.create({
        data: {
          username: req.body.username,
          phone: req.body.phone,
          address: req.body.address,
          password: hash,
          role: req.body.role,
          email: req.body.email,
          status: req.body.status,
          gender: req.body.gender,
          source: req.body.source,
          sku: req.body.sku
        }
      });

      await prisma.auditLog.create({
        data: {
          action: "Création d'un client",
          auditableId: createdCustomer.id,
          auditableModel: "Client",
          ActorAuditableModel: req.authenticatedEntityType,
          IdUser:
            req.authenticatedEntityType === "user"
              ? req.authenticatedEntity.id
              : null,
          IdCustomer:
            req.authenticatedEntityType === "customer"
              ? req.authenticatedEntity.id
              : null,
          oldValues: undefined,
          newValues: createdCustomer,
          timestamp: new Date()
        }
      });
      res.json(createdCustomer);
    } catch (error) {
      res.status(400).json({ message: error.message });
      console.log(error.message);
    }
  }
};

// Fonction pour générer un token de réinitialisation de mot de passe
const generateResetToken = (customerId) => {
  // Créer un token avec l'ID de l'utilisateur, qui expire dans 1 heure
  return jwt.sign({ id: customerId }, process.env.JWT_SECRET, {
    expiresIn: "1h"
  });
};
// Route pour envoyer le token de réinitialisation par email
const sendTokenResetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Si ce n'est pas un utilisateur, cherchez comme client
    const customer = await prisma.customer.findUnique({
      where: {
        email: email
      }
    });
    // Si l'utilisateur n'existe pas
    if (!customer) {
      return res.status(404).json({ error: "User not found" });
    }
    // Génération du token de réinitialisation
    const token = generateResetToken(customer.id); // Appel de la fonction générée ci-dessus
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Envoyer l'email de réinitialisation
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Changez votre mot de passe",
      html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Pour ce faire, veuillez cliquer sur le bouton ci-dessous :</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a>
      <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
      <p>Cordialement,<br>L'équipe de support.</p>
    </div>
  `
    });

    // Réponse réussie
    res.json({
      message: "le token a été envoyé. consultez votre adresse électronique"
    });
  } catch (error) {
    console.error("Error in password reset:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Route pour réinitialiser le mot de passe avec un token
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Décoder le token pour récupérer l'ID de l'utilisateur
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const customerId = decodedToken.id;

    // Cherche le client par ID

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Hachage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mise à jour du mot de passe dans la base de données
    await prisma.customer.update({
      where: { id: customerId },
      data: { password: hashedPassword }
    });

    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    console.error("Erreur de réinitialisation de mot de passe:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
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
  } else if (req.query.query === "search") {
    try {
      // get all customer
      const allCustomer = await prisma.customer.findMany({
        where: {
          OR: [
            {
              username: {
                contains: req.query.cus,
                mode: "insensitive"
              }
            },
            {
              email: {
                contains: req.query.cus,
                mode: "insensitive"
              }
            },
            {
              sku: {
                contains: req.query.cus,
                mode: "insensitive"
              }
            }
          ]
        },
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
    const { id } = req.params; // Récupération de l'ID depuis les paramètres de la requête

    // Récupérer les anciennes valeurs du client
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: Number(id) }
    });

    // Vérifier si le client existe
    if (!existingCustomer) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    // Créer un hash pour le mot de passe si fourni dans la requête
    const hash = req.body.password
      ? await bcrypt.hash(req.body.password, saltRounds)
      : existingCustomer.password;

    // Mettre à jour les informations du client
    const updatedCustomer = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        username: req.body.username || existingCustomer.username,
        phone: req.body.phone || existingCustomer.phone,
        address: req.body.address || existingCustomer.address,
        password: hash,
        role: req.body.type_customer || existingCustomer.role,
        email: req.body.email || existingCustomer.email,
        status: req.body.status || existingCustomer.status
      }
    });

    // Créer une entrée dans le journal d'audit
    await prisma.auditLog.create({
      data: {
        action: "Modifications des données d'un client",
        auditableId: updatedCustomer.id,
        auditableModel: "Client",
        ActorAuditableModel: req.authenticatedEntityType,
        IdUser:
          req.authenticatedEntityType === "user"
            ? req.authenticatedEntity.id
            : null,
        IdCustomer:
          req.authenticatedEntityType === "customer"
            ? req.authenticatedEntity.id
            : null,
        oldValues: existingCustomer,
        newValues: updatedCustomer,
        timestamp: new Date()
      }
    });

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message }); // Assurez-vous que `error.message` est une chaîne
    console.error(error.message); // Utilisez console.error pour les erreurs
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
  deleteSingleCustomer,
  sendTokenResetPassword,
  resetPassword
};
