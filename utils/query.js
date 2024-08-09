DEFAULT_PAGE = 1;
DEFAULT_PAGE_LIMIT = 10;

const getPagination = (query) => {
  const page = Math.abs(query.page) || DEFAULT_PAGE;
  const limit = Math.abs(query.count) || DEFAULT_PAGE_LIMIT;
  const skip = (page - 1) * limit;
  return {
    skip,
    limit,
  };
};

const getPaginationLogs = (query) => {
  const page = Math.abs(query.page) || DEFAULT_PAGE;
  const limit = Math.abs(query.limit) || DEFAULT_PAGE_LIMIT; // Assurez-vous que 'count' est remplacé par 'limit'
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit, // Le paramètre pour la quantité est 'take' dans Prisma
  };
};

module.exports = { getPagination, getPaginationLogs };
