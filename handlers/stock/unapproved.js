const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const reduce 		= require('lodash/reduce');
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
	const limit 		= req.params.limit;
	const settings 	= req.settings.unapproved;

	const status = reduce(settings, (acc, status, key) => {
		if (status.value) acc.push(key);

		return acc;
	}, []).join(',');

	return req.mssql.request()
      .query("SELECT " + (limit && limit > 0 ? "TOP " + limit + " " : "") + "dbo.Stock.RECID, dbo.Stock.ITEMNO, dbo.Stock.PGROUP, dbo.Stock.GRPCODE, dbo.Stock.LASTSER#1, dbo.Stock.PERIOD#1, dbo.Stock.CURRDEPOT, dbo.Stock.DESC#1, dbo.Stock.DESC#2, dbo.Stock.DESC#3 FROM dbo.Stock WHERE dbo.Stock.LASTSER#1 LIKE '%1899%' AND dbo.Stock.PATTEST = '1' AND dbo.Stock.STATUS IN (" + status + ") ORDER BY DESC#1 ASC")
      .then(result => {
          return res.status(200).send({ success: true, body: result.recordset });
      })
      .catch(next)
  ;
}
