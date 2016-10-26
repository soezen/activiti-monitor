function Cache() {
	var items = {};
	
	function put(data, params) {
		console.debug('add to cache ' + params.key + ' = ' + data);
		items[params.key] = data;
	}
	
	function get(key) {
		return items[key];
	}
	
	return {
		put: put,
		get: get
	}
}