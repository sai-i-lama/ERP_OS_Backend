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

module.exports = { getPagination };
