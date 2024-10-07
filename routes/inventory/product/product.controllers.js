const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST;

const createSingleProduct = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      // delete many product at once
      const deletedProduct = await prisma.product.deleteMany({
        where: {
          id: {
            in: req.body.map((id) => Number(id))
          }
        }
      });
      res.json(deletedProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "createmany") {
    try {
      // sum all total purchase price
      const totalPurchasePrice = req.body.reduce((acc, cur) => {
        return acc + cur.quantity * cur.purchase_price;
      }, 0);
      // convert incoming data to specific format
      const data = req.body.map((item) => {
        return {
          name: item.name || null,
          quantity: parseInt(item.quantity) || null,
          purchase_price: parseFloat(item.purchase_price) || null,
          sale_price: parseFloat(item.sale_price) || null,
          product_category_id: parseInt(item.product_category_id) || null,
          idSupplier: parseInt(item.idSupplier) || null,
          sku: item.sku || null,
          type_product: item.type_product || null,
          unit_measurement: parseFloat(item.unit_measurement) || null,
          unit_type: item.unit_type || null,
          reorder_quantity: parseInt(item.reorder_quantity) || null
        };
      });
      // create many product from an array of object
      const createdProduct = await prisma.product.createMany({
        data: data,
        skipDuplicates: true
      });
      // stock product's account transaction create
      await prisma.transaction.create({
        data: {
          date: new Date(),
          debit_id: 3,
          credit_id: 6,
          amount: totalPurchasePrice,
          particulars: `Initial stock of ${createdProduct.count} item/s of product`
        }
      });
      res.json(createdProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    try {
      const file = req.file;
      console.log("req.auth:", req.auth); // Debugging log
      const newQuantity = parseInt(req.body.quantity);

      // Création du produit
      const createdProduct = await prisma.product.create({
        data: {
          name: req.body.name || null,
          quantity: newQuantity || null,
          purchase_price: parseFloat(req.body.purchase_price) || null,
          sale_price: parseFloat(req.body.sale_price) || null,
          imageName: file.filename,
          product_category: {
            connect: {
              id: Number(req.body.product_category_id)
            }
          },
          supplier: {
            connect: {
              id: Number(req.body.idSupplier)
            }
          },
          sku: req.body.sku,
          unit_measurement: parseFloat(req.body.unit_measurement) || null,
          unit_type: req.body.unit_type || null,
          type_product: req.body.type_product || null,
          reorder_quantity: parseInt(req.body.reorder_quantity) || null
        }
      });

      // Récupérer le nombre de lots existants pour ce produit
      const existingLotsCount = await prisma.lot.count({
        where: { productId: createdProduct.id }
      });

      // Incrémenter le numéro de lot
      const nextLotNumber = existingLotsCount + 1;

      // Création du nouveau lot
      const newLot = await prisma.lot.create({
        data: {
          productId: createdProduct.id,
          initialQuantity: newQuantity,
          quantityInStock: newQuantity, // Initialement, c'est la même que la quantité ajoutée
          sku: `${createdProduct.sku}-Lot${nextLotNumber}`, // SKU unique pour le lot
          productionDate: new Date(req.body.productionDate), // Date de production
          expirationDate: new Date(req.body.expirationDate) // Date d'expiration
        }
      });

      const actionType =
        req.body.type_product === "Produit fini"
          ? "Création d'un produit"
          : "Création d'une matière première";

      await prisma.auditLog.create({
        data: {
          action: actionType,
          auditableId: createdProduct.id,
          auditableModel: "Produits",
          ActorAuditableModel: req.authenticatedEntityType,
          IdUser:
            req.authenticatedEntityType === "user"
              ? req.authenticatedEntity.id
              : null,
          IdCustomer:
            req.authenticatedEntityType === "customer"
              ? req.authenticatedEntity.id
              : null,
          oldValues: undefined, // Les anciennes valeurs ne sont pas nécessaires pour la création
          newValues: createdProduct,
          timestamp: new Date()
        }
      });

      createdProduct.imageUrl = `${HOST}:${PORT}/v1/product-image/${file.filename}`;

      await prisma.transaction.create({
        data: {
          date: new Date(),
          debit_id: 3,
          credit_id: 6,
          amount:
            parseFloat(req.body.purchase_price) * parseInt(req.body.quantity),
          particulars: `Initial stock of product #${createdProduct.id}`
        }
      });

      // Retourner les informations du produit et du lot
      res.json({
        product: createdProduct,
        lot: newLot
      });
      console.log(createdProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getAllProduct = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allProduct = await prisma.product.findMany({
        orderBy: {
          id: "desc"
        },
        include: {
          product_category: {
            select: {
              name: true
            }
          },
          supplier: {
            select: {
              name: true
            }
          }
        }
      });
      // attach signed url to each product
      for (let product of allProduct) {
        if (product.imageName) {
          product.imageUrl = `${HOST}:${PORT}/v1/product-image/${product.imageName}`;
        }
      }
      res.json(allProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "search") {
    try {
      const allProduct = await prisma.product.findMany({
        where: {
          OR: [
            {
              name: {
                contains: req.query.prod,
                mode: "insensitive"
              }
            },
            {
              sku: {
                contains: req.query.prod,
                mode: "insensitive"
              }
            }
          ]
        },
        orderBy: {
          id: "desc"
        },
        include: {
          product_category: {
            select: {
              name: true
            }
          },
          supplier: {
            select: {
              name: true
            }
          }
        }
      });
      // attach signed url to each product
      for (let product of allProduct) {
        if (product.imageName) {
          product.imageUrl = `${HOST}:${PORT}/v1/product-image/${product.imageName}`;
        }
      }
      res.json(allProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "info") {
    const aggregations = await prisma.product.aggregate({
      _count: {
        id: true
      },
      _sum: {
        quantity: true
      },
      where: {
        status: true
      }
    });
    // get all product and calculate all purchase price and sale price
    const allProduct = await prisma.product.findMany();
    const totalPurchasePrice = allProduct.reduce((acc, cur) => {
      return acc + cur.quantity * cur.purchase_price;
    }, 0);
    const totalSalePrice = allProduct.reduce((acc, cur) => {
      return acc + cur.quantity * cur.sale_price;
    }, 0);
    res.json({ ...aggregations, totalPurchasePrice, totalSalePrice });
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      const allProduct = await prisma.product.findMany({
        orderBy: {
          id: "desc"
        },
        where: {
          status: false
        },
        include: {
          product_category: {
            select: {
              name: true
            }
          },
          supplier: {
            select: {
              name: true
            }
          }
        },
        skip: Number(skip),
        take: Number(limit)
      });
      // attach signed url to each product
      for (let product of allProduct) {
        if (product.imageName) {
          product.imageUrl = `${HOST}:${PORT}/v1/product-image/${product.imageName}`;
        }
      }
      res.json(allProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allProduct = await prisma.product.findMany({
        orderBy: {
          id: "desc"
        },
        where: {
          status: true
        },
        include: {
          product_category: {
            select: {
              name: true
            }
          },
          supplier: {
            select: {
              name: true
            }
          }
        },
        skip: Number(skip),
        take: Number(limit)
      });
      // attach signed url to each product
      for (let product of allProduct) {
        if (product.imageName) {
          product.imageUrl = `${HOST}:${PORT}/v1/product-image/${product.imageName}`;
        }
      }
      res.json(allProduct);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const singleProduct = await prisma.product.findUnique({
      where: {
        id: Number(req.params.id)
      },
      include: {
        Lots: true
      }
    });
    if (singleProduct && singleProduct.imageName) {
      singleProduct.imageUrl = `${HOST}:${PORT}/v1/product-image/${singleProduct.imageName}`;
    }
    res.json(singleProduct);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSingleProduct = async (req, res) => {
  try {
    // Récupérer les anciennes valeurs du produit avant mise à jour
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(req.params.id) }
    });

    // Vérifier si le produit existe
    if (!existingProduct) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    // Vérifier si la quantité a été modifiée
    const newQuantity = parseInt(req.body.quantity);
    const quantityChanged = newQuantity !== existingProduct.quantity;

    // Mettre à jour le produit avec la nouvelle quantité
    const updatedProduct = await prisma.product.update({
      where: {
        id: Number(req.params.id)
      },
      data: {
        name: req.body.name,
        quantity: newQuantity, // Quantité totale après ajout
        purchase_price: parseFloat(req.body.purchase_price),
        sale_price: parseFloat(req.body.sale_price),
        updated_at: new Date()
      }
    });

    // Récupérer le nombre de lots existants pour ce produit
    const existingLotsCount = await prisma.lot.count({
      where: { productId: updatedProduct.id }
    });

    // Incrémenter le numéro de lot
    const nextLotNumber = existingLotsCount + 1;

    // Créer un nouveau lot avec la quantité ajoutée si la quantité a changé
    if (quantityChanged) {
      const quantity_lot = newQuantity - existingProduct.quantity;

      const lot = await prisma.lot.create({
        data: {
          product: {
            connect: { id: updatedProduct.id } // Relier le lot au produit
          },
          initialQuantity: quantity_lot, // Quantité ajoutée
          quantityInStock: quantity_lot, // Quantité disponible pour ce lot
          sku: `${updatedProduct.sku}-Lot${nextLotNumber}`, // SKU unique avec numéro de lot
          productionDate: new Date(req.body.productionDate), // Date de production
          expirationDate: new Date(req.body.expirationDate) // Date d'expiration
        }
      });
      console.log(lot);
    }

    // Créer une entrée dans l'audit log pour la mise à jour
    await prisma.auditLog.create({
      data: {
        action: "Mise à jour du produit",
        auditableId: updatedProduct.id,
        auditableModel: "Produits",
        ActorAuditableModel: req.authenticatedEntityType,
        IdUser:
          req.authenticatedEntityType === "user"
            ? req.authenticatedEntity.id
            : null,
        IdCustomer:
          req.authenticatedEntityType === "customer"
            ? req.authenticatedEntity.id
            : null,
        oldValues: existingProduct,
        newValues: updatedProduct,
        timestamp: new Date()
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const deleteSingleProduct = async (req, res) => {
  try {
    const deletedProduct = await prisma.product.update({
      where: {
        id: Number(req.params.id)
      },
      data: {
        status: req.body.status
      }
    });
    // TODO: implement delete image from disk
    // if (deletedProduct && deletedProduct.imageName) {
    //   await deleteFile(deletedProduct.imageName);
    // }

    // Récupérer les anciennes valeurs du produit
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(req.params.id) }
    });

    // Vérifier si le client existe
    if (!existingProduct) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    await prisma.auditLog.create({
      data: {
        action: actionType,
        auditableId: deletedProduct.id,
        auditableModel: "Produits",
        ActorAuditableModel: req.authenticatedEntityType,
        IdUser:
          req.authenticatedEntityType === "user"
            ? req.authenticatedEntity.id
            : null,
        IdCustomer:
          req.authenticatedEntityType === "customer"
            ? req.authenticatedEntity.id
            : null,
        oldValues: existingProduct, // Les anciennes valeurs ne sont pas nécessaires pour la création
        newValues: deletedProduct,
        timestamp: new Date()
      }
    });
    res.json(deletedProduct);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleProduct,
  getAllProduct,
  getSingleProduct,
  updateSingleProduct,
  deleteSingleProduct
};
