const sortBy = require('lodash/sortBy');
const reduce = require('lodash/reduce');

module.exports = function (req, res, next) {
		return req.redis.keys('jdj:logs:*').then(keys => {
				if (!keys || !keys.length) return res.status(200).send({ success: true, body:[] });

					return req.redis.mget(keys).then(results => {
							const logs = reduce(results, (acc, log) => {
									acc.push(JSON.parse(log));
									return acc;
							}, [])

							return res.status(200).send({ success: true, body: sortBy(logs, ['ts']).reverse() });
					});
      })
      .catch(next)
    ;
}
