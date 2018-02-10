const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		return req.mssql.request()
	      .input('itemno', sql.NVarChar, req.params.itemno.toLowerCase().replace(/\W/g, ''))
        .query('SELECT TOP 1 * FROM dbo.CONTDOC WHERE LOWER(dbo.CONTDOC.[KEY]) = @itemno')
        .then(result => res.status(200).send({ success: true, body: (result.recordset.length ? result.recordset[0] : null) }))
        .catch(next)
      ;
}
