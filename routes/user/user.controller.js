const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const login = async (req, res) => {
  try {
    const allUser = await prisma.user.findMany();
    const user = allUser.find(
      (u) =>
        u.username === req.body.username &&
        bcrypt.compareSync(req.body.password, u.password)
    );
    // get permission from user roles
    const permissions = await prisma.role.findUnique({
      where: {
        name: user.role,
      },
      include: {
        rolePermission: {
          include: {
            permission: true,
          },
        },
      },
    });
    // store all permissions name to an array
    const permissionNames = permissions.rolePermission.map(
      (rp) => rp.permission.name
    );
    // console.log("permissionNames", permissionNames);
    if (user) {
      const token = jwt.sign(
        { sub: user.id, permissions: permissionNames },
        secret,
        {
          expiresIn: "24h",
        }
      );
      const { password, ...userWithoutPassword } = user;
      return res.json({
        ...userWithoutPassword,
        token,
      });
    }
    return res
      .status(400)
      .json({ message: "Username or password is incorrect" });
  } catch (error) {
    res.status(500).json(error.message);
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
        status: req.body.status,
        designation: {
          connect: {
            id: Number(req.body.designation_id),
          },
        },
      },
    });
    const { password, ...userWithoutPassword } = createUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

const getAllUser = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allUser = await prisma.user.findMany({
        include: {
          saleInvoice: true,
        },
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
          status: false,
        },
        include: {
          saleInvoice: true,
        },
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
          status: true,
        },
        include: {
          saleInvoice: true,
        },
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
      id: Number(req.params.id),
    },
    include: {
      saleInvoice: true,
    },
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
      message: "Unauthorized. You can only edit your own record.",
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
          id: Number(req.params.id),
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
              id: Number(req.body.designation_id),
            },
          },
        },
      });
      const { password, ...userWithoutPassword } = updateUser;
      res.json(userWithoutPassword);
    } else {
      // owner can change only password
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const updateUser = await prisma.user.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          password: hash,
        },
      });
      const { password, ...userWithoutPassword } = updateUser;
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
    const deleteUser = await prisma.user.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        status: req.body.status,
      },
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
};
