const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		const date = req.params.date;

		return req.mssql.request()
				.input('docdate', sql.NVarChar, date)
        .query(`SELECT
							TOP 1000 [IHDATA].[dbo].[Stock].RECID,
							[IHDATA].[dbo].[Stock].STATUS,
							[IHDATA].[dbo].[Stock].ITEMNO,
							[IHDATA].[dbo].Stock.PGROUP, 
							[IHDATA].[dbo].Stock.GRPCODE
							[IHDATA].[dbo].[CONTDOC].FILENAME,
							[IHDATA].[dbo].[ContItems].DOCDATE#5,
							[IHDATA].[dbo].[ContItems].STATUS
						FROM
							[IHDATA].[dbo].Stock
						INNER JOIN
							[IHDATA].[dbo].[ContItems]
						ON
							[IHDATA].[dbo].[Stock].ITEMNO = [IHDATA].[dbo].[ContItems].ITEMNO
						INNER JOIN
							[IHDATA].[dbo].[CONTDOC]
						ON
							[IHDATA].[dbo].[ContItems].ITEMNO = [IHDATA].[dbo].[CONTDOC].[KEY]
						WHERE
							[IHDATA].[dbo].[Stock].STATUS = '1'
						AND
							[IHDATA].[dbo].[ContItems].STATUS = '2'
						AND
							CONVERT(DATE, [IHDATA].[dbo].[ContItems].[DOCDATE#5]) = @docdate
						ORDER BY
							[IHDATA].[dbo].[ContItems].[DOCDATE#5] DESC`)
        .then(result => {
            return res.status(200).send({ success: true, body: result.recordset });
        })
        .catch(next)
      ;
}
