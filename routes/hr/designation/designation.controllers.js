const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSingleDesignation = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      // delete many designation at once
      const deletedDesignation = await prisma.designation.deleteMany({
        where: {
          id: {
            in: req.body,
          },
        },
      });
      res.json(deletedDesignation);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else if (req.query.query === "createmany") {
    try {
      // create many designation from an array of objects
      const createdDesignation = await prisma.designation.createMany({
        data: req.body,
        skipDuplicates: true,
      });
      res.json(createdDesignation);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    try {
      // create single designation from an object
      const createdDesignation = await prisma.designation.create({
        data: {
          name: req.body.name,
        },
      });
      res.json(createdDesignation);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getAllDesignation = async (req, res) => {
  if (req.query.query === "all") {
    try {
      // get all designation
      const allDesignation = await prisma.designation.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              salary: true,
              designation: true,
              join_date: true,
              leave_date: true,
              phone: true,
              id_no: true,
              address: true,
              blood_group: true,
              image: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      res.json(allDesignation);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get all designation paginated
      const allDesignation = await prisma.designation.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              salary: true,
              designation: true,
              join_date: true,
              leave_date: true,
              phone: true,
              id_no: true,
              address: true,
              blood_group: true,
              image: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });
      res.json(allDesignation);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleDesignation = async (req, res) => {
  try {
    const singleDesignation = await prisma.designation.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            salary: true,
            designation: true,
            join_date: true,
            leave_date: true,
            phone: true,
            id_no: true,
            address: true,
            blood_group: true,
            image: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    res.json(singleDesignation);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSingleDesignation = async (req, res) => {
  try {
    const updatedDesignation = await prisma.designation.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        name: req.body.name,
      },
    });
    res.json(updatedDesignation);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const deleteSingleDesignation = async (req, res) => {
  try {
    const deletedDesignation = await prisma.designation.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });
    res.json(deletedDesignation);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleDesignation,
  getAllDesignation,
  getSingleDesignation,
  updateSingleDesignation,
  deleteSingleDesignation,
};
