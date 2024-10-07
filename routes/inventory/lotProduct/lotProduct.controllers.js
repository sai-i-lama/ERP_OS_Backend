const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CreateLotProduct = async (req, res) => {
  try {
    const productId = Number(req.body.productId); // Identifiant du produit auquel ajouter un lot
    const additionalQuantity = parseInt(req.body.quantity); // Nouvelle quantité ajoutée au lot

    // Mise à jour de la quantité du produit global
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: additionalQuantity // Incrémente la quantité totale du produit
        }
      }
    });

    // Création du nouveau lot pour le produit
    const newLot = await prisma.lot.create({
      data: {
        productId: productId,
        initial_quantity: additionalQuantity,
        quantity_in_stock: additionalQuantity,
        sku: req.body.sku,
        productionDate: new Date(req.body.productionDate),
        expirationDate: req.body.expirationDate
          ? new Date(req.body.expirationDate)
          : null
      }
    });

    res.json({ updatedProduct, newLot });
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  CreateLotProduct
};
