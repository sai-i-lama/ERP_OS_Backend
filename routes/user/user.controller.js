const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");
require("dotenv").config();

const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const checkMatricule = async (req, res) => {
  try {
    const { id_no } = req.body;

    const userWithIdNo = await prisma.user.findUnique({
      where: {
        id_no: id_no
      }
    });

    if (userWithIdNo) {
      return res.json({ success: true, message: "ID number found" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "ID number not found" });
    }
  } catch (error) {
    console.error("Error checking ID number:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cherche d'abord comme utilisateur
    let user = await prisma.user.findUnique({
      where: {
        email: email
      }
    });

    let userType = "user"; // Par défaut, l'utilisateur est un "user"

    // Si ce n'est pas un utilisateur, cherchez comme client
    if (!user) {
      user = await prisma.customer.findUnique({
        where: {
          email: email // Utilisez `email` pour la recherche de client
        }
      });
      userType = "customer"; // Si trouvé comme client, définissez userType sur "customer"
    }

    // Vérifiez le mot de passe pour l'utilisateur trouvé
    if (user && bcrypt.compareSync(password, user.password)) {
      // Obtenez les permissions basées sur le rôle de l'utilisateur ou du client
      let permissions = [];
      if (user.role) {
        const role = await prisma.role.findUnique({
          where: {
            name: user.role
          },
          include: {
            rolePermission: {
              include: {
                permission: true
              }
            }
          }
        });
        permissions = role.rolePermission.map((rp) => rp.permission.name);
      }

      // Création du token JWT
      const token = jwt.sign(
        { sub: user.id, permissions, role: user.role, userType: userType }, // Ajoutez `userType` pour indiquer le type d'entité
        secret,
        { expiresIn: "24h" }
      );

      // Supprimez le mot de passe avant de renvoyer les informations de l'utilisateur
      const { password, ...userWithoutPassword } = user;

      return res.json({
        ...userWithoutPassword,
        token
      });
    } else {
      return res
        .status(400)
        .json({ message: "Email or password is incorrect" });
    }
  } catch (error) {
    console.error("Backend error:", error);
    res.status(500).json({ message: error.message });
  }
};

const register = async (req, res) => {
  try {
    const join_date = new Date(req.body.join_date).toISOString().split("T")[0];
    const leave_date = new Date(req.body.leave_date)
      .toISOString()
      .split("T")[0];

    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const createUser = await prisma.user.create({
      data: {
        username: req.body.username,
        password: hash,
        role: req.body.role,
        email: req.body.email,
        salary: parseInt(req.body.salary),
        join_date: new Date(join_date),
        leave_date: new Date(leave_date),
        id_no: req.body.id_no,
        department: req.body.department,
        phone: req.body.phone,
        address: req.body.address,
        blood_group: req.body.blood_group,
        image: req.body.image,
        gender: req.body.gender,
        status: req.body.status,
        designation: {
          connect: {
            id: Number(req.body.designation_id)
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATION DU PERSONNEL",
        auditableId: createUser.id,
        auditableModel: "Personnel",
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
        newValues: createUser,
        timestamp: new Date()
      }
    });

    const { password, ...userWithoutPassword } = createUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json(error.response ? error.response.data : error.message);
  }
};

const getAllUser = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allUser = await prisma.user.findMany({
        include: {
          saleInvoice: true
        }
      });
      res.json(
        allUser
          .map((u) => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );
    } catch (error) {
      res.status(500).json(error.message);
    }
  } else if (req.query.status === "false") {
    try {
      const allUser = await prisma.user.findMany({
        where: {
          status: false
        },
        include: {
          saleInvoice: true
        }
      });
      res.json(
        allUser
          .map((u) => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );
    } catch (error) {
      res.status(500).json(error.message);
    }
  } else {
    try {
      const allUser = await prisma.user.findMany({
        where: {
          status: true
        },
        include: {
          saleInvoice: true
        }
      });
      res.json(
        allUser

          .map((u) => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
          })
          .sort((a, b) => a.id - b.id)
      );
    } catch (error) {
      res.status(500).json(error.message);
    }
  }
};

const getSingleUser = async (req, res) => {
  const singleUser = await prisma.user.findUnique({
    where: {
      id: Number(req.params.id)
    },
    include: {
      saleInvoice: true
    }
  });
  const id = parseInt(req.params.id);

  // only allow admins and owner to access other user records
  // console.log(id !== req.auth.sub && !req.auth.permissions.includes("viewUser"));
  if (id !== req.auth.sub && !req.auth.permissions.includes("viewUser")) {
    return res
      .status(401)
      .json({ message: "Unauthorized. You are not an admin" });
  }

  if (!singleUser) return;
  const { password, ...userWithoutPassword } = singleUser;
  res.json(userWithoutPassword);
};

const updateSingleUser = async (req, res) => {
  const id = parseInt(req.params.id);
  // only allow admins and owner to edit other user records
  // console.log(
  //   id !== req.auth.sub && !req.auth.permissions.includes("updateUser")
  // );
  if (id !== req.auth.sub && !req.auth.permissions.includes("updateUser")) {
    return res.status(401).json({
      message: "Unauthorized. You can only edit your own record."
    });
  }
  try {
    // admin can change all fields
    if (req.auth.permissions.includes("updateUser")) {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const join_date = new Date(req.body.join_date)
        .toISOString()
        .split("T")[0];
      const leave_date = new Date(req.body.leave_date)
        .toISOString()
        .split("T")[0];
      const updateUser = await prisma.user.update({
        where: {
          id: Number(req.params.id)
        },
        data: {
          username: req.body.username,
          password: hash,
          role: req.body.role,
          email: req.body.email,
          salary: parseInt(req.body.salary),
          join_date: new Date(join_date),
          leave_date: new Date(leave_date),
          id_no: req.body.id_no,
          department: req.body.department,
          phone: req.body.phone,
          address: req.body.address,
          blood_group: req.body.blood_group,
          image: req.body.image,
          status: req.body.status,
          designation: {
            connect: {
              id: Number(req.body.designation_id)
            }
          }
        }
      });
      const { password, ...userWithoutPassword } = updateUser;

      const { id } = req.params; // Récupération de l'ID depuis les paramètres de la requête

      const existingUser = await prisma.user.findUnique({
        where: { id: Number(id) }
      });
      // Vérifier si le user existe
      if (!existingUser) {
        return res.status(404).json({ message: "User non trouvé" });
      }

      await prisma.auditLog.create({
        data: {
          action: "MODIFICATION DU PERSONNEL",
          auditableId: userWithoutPassword.id,
          auditableModel: "Personnel",
          ActorAuditableModel: req.authenticatedEntityType,
          IdUser:
            req.authenticatedEntityType === "user"
              ? req.authenticatedEntity.id
              : null,
          IdCustomer:
            req.authenticatedEntityType === "customer"
              ? req.authenticatedEntity.id
              : null,
          oldValues: existingUser, // Les anciennes valeurs ne sont pas nécessaires pour la création
          newValues: userWithoutPassword,
          timestamp: new Date()
        }
      });
      res.json(userWithoutPassword);
    } else {
      // owner can change only password
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const updateUser = await prisma.user.update({
        where: {
          id: Number(req.params.id)
        },
        data: {
          password: hash
        }
      });
      const { password, ...userWithoutPassword } = updateUser;

      const { id } = req.params; // Récupération de l'ID depuis les paramètres de la requête

      const existingUser = await prisma.user.findUnique({
        where: { id: Number(id) }
      });
      // Vérifier si le user existe
      if (!existingUser) {
        return res.status(404).json({ message: "User non trouvé" });
      }

      await prisma.auditLog.create({
        data: {
          action: "MODIFICATION DU PERSONNEL",
          auditableId: userWithoutPassword.id,
          auditableModel: "Personnel",
          ActorAuditableModel: req.authenticatedEntityType,
          IdUser:
            req.authenticatedEntityType === "user"
              ? req.authenticatedEntity.id
              : null,
          IdCustomer:
            req.authenticatedEntityType === "customer"
              ? req.authenticatedEntity.id
              : null,
          oldValues: existingUser, // Les anciennes valeurs ne sont pas nécessaires pour la création
          newValues: userWithoutPassword,
          timestamp: new Date()
        }
      });

      res.json(userWithoutPassword);
    }
  } catch (error) {
    res.status(500).json(error.message);
  }
};

const deleteSingleUser = async (req, res) => {
  // const id = parseInt(req.params.id);
  // only allow admins to delete other user records
  if (!req.auth.permissions.includes("deleteUser")) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Only admin can delete." });
  }
  try {
    const { id } = req.params; // Récupération de l'ID depuis les paramètres de la requête

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });
    // Vérifier si le user existe
    if (!existingUser) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const deleteUser = await prisma.user.update({
      where: {
        id: Number(req.params.id)
      },
      data: {
        status: req.body.status
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "SUPPRESSION DU PERSONNEL",
        auditableId: deleteUser.id,
        auditableModel: "Personnel",
        ActorAuditableModel: req.authenticatedEntityType,
        IdUser:
          req.authenticatedEntityType === "user"
            ? req.authenticatedEntity.id
            : null,
        IdCustomer:
          req.authenticatedEntityType === "customer"
            ? req.authenticatedEntity.id
            : null,
        oldValues: existingUser, // Les anciennes valeurs ne sont pas nécessaires pour la création
        newValues: deleteUser,
        timestamp: new Date()
      }
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json(error.message);
  }
};

module.exports = {
  login,
  register,
  getAllUser,
  getSingleUser,
  updateSingleUser,
  deleteSingleUser,
  checkMatricule
};
