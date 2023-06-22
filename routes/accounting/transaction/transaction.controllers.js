const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createSingleTransaction = async (req, res) => {
  try {
    // convert all incoming data to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    const createdTransaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        debit: {
          connect: {
            id: Number(req.body.debit_id),
          },
        },
        credit: {
          connect: {
            id: Number(req.body.credit_id),
          },
        },
        particulars: req.body.particulars,
        amount: parseFloat(req.body.amount),
      },
    });
    res.status(200).json(createdTransaction);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const getAllTransaction = async (req, res) => {
  if (req.query.query === "info") {
    const aggregations = await prisma.transaction.aggregate({
      where: {
        status: true,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });
    res.json(aggregations);
  } else if (req.query.query === "all") {
    const allTransaction = await prisma.transaction.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
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
    res.json(allTransaction);
  } else if (req.query.query === "inactive") {
    const { skip, limit } = getPagination(req.query);
    try {
      const [aggregations, allTransaction] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.transaction.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            amount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: false,
          },
        }),
        // get transaction paginated and by start and end date
        prisma.transaction.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: false,
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
        }),
      ]);
      res.json({ aggregations, allTransaction });
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const [aggregations, allTransaction] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.transaction.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            amount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: true,
          },
        }),
        // get transaction paginated and by start and end date
        prisma.transaction.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
            status: true,
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
        }),
      ]);
      res.json({ aggregations, allTransaction });
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleTransaction = async (req, res) => {
  try {
    const singleTransaction = await prisma.transaction.findUnique({
      where: {
        id: Number(req.params.id),
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
    res.json(singleTransaction);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// TODO: update account as per transaction
const updateSingleTransaction = async (req, res) => {
  try {
    // convert all incoming data to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        date: new Date(date),
        particulars: req.body.particulars,
        type: "transaction",
        related_id: 0,
        amount: parseFloat(req.body.amount),
      },
    });
    // TO DO: update transaction account
    res.json(updatedTransaction);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// delete and update account as per transaction
const deleteSingleTransaction = async (req, res) => {
  try {
    const deletedTransaction = await prisma.transaction.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        status: req.body.status,
      },
    });
    res.status(200).json(deletedTransaction);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleTransaction,
  getAllTransaction,
  getSingleTransaction,
  updateSingleTransaction,
  deleteSingleTransaction,
};
