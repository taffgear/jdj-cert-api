const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		return req.mssql.request()
	      .input('itemno', sql.NVarChar, req.params.itemno.toLowerCase().replace(/\W/g, ''))
        .query('SELECT TOP 1 dbo.Stock.ITEMNO, dbo.Stock.PGROUP, dbo.Stock.GRPCODE, dbo.Stock.LASTSER#1, dbo.Stock.PATLASTSER, dbo.Stock.STATUS FROM dbo.Stock WHERE LOWER(dbo.Stock.ITEMNO) = @itemno')
        .then(result => {
            if (!result || !result.recordset.length)
              throw new errors.http.NotFound('Could not find stock item with itemno: ' + req.params.itemno);

            return res.status(200).send({ success: true, body: result.recordset[0] });
        })
        .catch(next)
      ;
}
