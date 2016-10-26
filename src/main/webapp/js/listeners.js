var listeners = (function() {
	var perEventType = {};
	
	function Listener(callback, params) {
		var items = [];
		var conditions = [];

		function isInterestedIn(event, item) {
			if (items.length > 0 && !item) {
				return true;
			}
			var interested = true;
			conditions.forEach(function(condition) {
				interested = interested && condition(event, item);
			});
			return interested;
		}

		function addConditions() {
			for (var i = 0; i < arguments.length; i++) {
				conditions.push(arguments[i]);
			}
		}

		function setItems(list) {
			// TODO validate list is an array
			items = list;
			return this;
		}

		function notify(event) {
			var resolvedParams = resolveParams(event);
			if (items.length == 0) {
				callback(event.data, resolvedParams);
			} else {
				items.forEach(function(item) {
					if (isInterestedIn(event, item)) {
						callback(event.data, resolvedParams);
					}
				});
			}
		}
		
		function resolveParams(event) {
			var resolvedParams = {};
			
			for (var i in params) {
				if (params.hasOwnProperty(i)) {
					var value = params[i];
					if (typeof value === 'function') {
						value = value(event);
					}
					resolvedParams[i] = value;
				}
			}
			
			return resolvedParams;
		}

		return {
			isInterestedIn : isInterestedIn,
			when : addConditions,
			forEachItemIn : setItems,
			notify : notify
		}
	}

	function on(eventType, callback, params) {
		var listener = new Listener(callback, params);
		perEventType[eventType] = perEventType[eventType] || [];
		perEventType[eventType].push(listener);
		return listener;
	}

	function notify(eventType, data) {
		console.debug('event: ' + eventType);
		if (!perEventType[eventType]) {
			return;
		}
		var event = {type : eventType, data : data};
		perEventType[eventType].forEach(function(l) {
			if (l.isInterestedIn(event)) {
				l.notify(event);
			}
		});
	}

	return {
		on: on,
		notify : notify
	}
})();