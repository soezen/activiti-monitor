function DiagramViewer(container) {
	
	var bpmnViewer;
	var padding = 20;
	
	$(document).ready(initBpmnViewer);
	
	// TODO use like for operation of variable to search in xml
	// TODO when search query is a list, show list and when item selected in list, then show diagram
	
	function initBpmnViewer() {
		function PropertiesModule(overlays, eventBus) {
			eventBus.on('element.hover', function(evt) {
				if (evt.element.activity 
						&& evt.element.type !== 'bpmn:StartEvent'
						&& evt.element.type !== 'bpmn:EndEvent' 
						&& evt.element.type !== 'bpmn:ParallelGateway') {
					var startHtml = '<span>' + gui.formatTime(evt.element.activity.startTime) + '</span>';
					var endHtml = '<span>' + gui.formatTime(evt.element.activity.endTime) + '</span>';
					overlays.add(evt.element, 'properties', {position: { top: -30, left: -50}, html: startHtml});
					overlays.add(evt.element, 'properties', {position: {bottom: -5, right: 100}, html: endHtml});
				}
			});
			eventBus.on('element.out', function(evt) {
				overlays.remove({ element: evt.element.id});
			});
		}

		function ZoomModule(canvas, eventBus) {
			// TODO move this to properties panel
//			eventBus.on('element.dblclick', function(d) {
//				if (isCallActivity(d.element)) {
//					activiti.loadSubProcess(d.element.businessObject.calledElement);
//				}
//			});
//			eventBus.on('element.click', function(d) {
//				if (d.element.type == 'label') {
//					return;
//				}
//				gui.showProperties(d.element, $('g[data-element-id=' + d.element.id + ']').hasClass('selected'));
//			});
			eventBus.on('shape.added', function(d) {
				if (isCallActivity(d.element)) {
					canvas.addMarker(d.element.id, 'call-activity');
				}
			});
			eventBus.on('shape.add', function(d) {
				d.element.hidden = false;
				if (d.element.type === 'label') {
					d.element.hidden = true;
				}
			});
			eventBus.on('import.success', function(d) {
				container.find('.djs-container').css('overflow', 'auto');

				var height = canvas.viewbox().inner.height;
				var width = canvas.viewbox().inner.width;
				var y = canvas.viewbox().inner.y;
				var x = canvas.viewbox().inner.x;
				
				container.find('.bjs-container').css('width', 'inherit');
				container.find('.bjs-container').css('height', 'inherit');
				var svg = container.find('.djs-container');
				svg.css('height', (height + y + (2*padding)) + 'px');
				svg.css('width', (width + x) + 'px');
				
			});
		}
		
		function isCallActivity(element) {
			return element.type === 'bpmn:CallActivity';
		}
		ZoomModule.$inject = ['canvas', 'eventBus'];
		PropertiesModule.$inject = ['overlays', 'eventBus'];
		
		var extensionModule = {
				__init__: ['zoom', 'properties'],
				zoom: ['type', ZoomModule],
				properties: ['type', PropertiesModule]
		};

		bpmnViewer = new window.BpmnJS({
			container : container,
			additionalModules: [ extensionModule]
		});
	}
	
	function load(bpmn) {
		bpmnViewer.importXML(bpmn, 
				function(err) {
					if (err) return console.error('could not import BPMN 2.0 diagram', err);
					bpmnViewer.get('eventBus').fire('diagram.loaded');
					listeners.notify('diagram.shown');
				});
	}
	
	function loadActivity(activity) {
		var registry = bpmnViewer.get('elementRegistry');
		var element = registry.get(activity.activityId);
		element.activity = activity;
	}
	
	function loadActivities() {
		var canvas = bpmnViewer.get('canvas');
		var registry = bpmnViewer.get('elementRegistry');

		registry.forEach(function (element) {
			var activity = element.activity;
			
			if (isFlow(element)) {
				if (isFlowTaken(element)) {
					canvas.addMarker(element, 'finished');
					colorEndMarker(element.id);
				}
			} else if (isCancelled(activity)) {
				canvas.addMarker(activity.activityId, 'cancelled');
			} else if (isFinished(activity)) {
				canvas.addMarker(activity.activityId, 'finished');
			} else if (isStarted(activity)) {
				canvas.addMarker(activity.activityId, 'running');
			}
		});
		
	}
	
	
	function isFlowTaken(flow) {
		var registry = bpmnViewer.get('elementRegistry');
		var source = registry.get(flow.source.id);
		var target = registry.get(flow.target.id);
		
		if (isParallelGateway(source)) {
			for (var i in source.incoming) {
				var incoming = source.incoming[i];
				if (!isFlowTaken(incoming)) {
					return false;
				}
			}
			return true;
		}
		
		return isFinished(source.activity) && isStarted(target.activity);
	}
	
	function colorEndMarker(flowId) {
		// TODO do not color annotation connections
		var path = $('g[data-element-id=' + flowId + '] > .djs-visual > path');
		var markerUrl = path.css('marker-end');
		if (!markerUrl) return;
		var markerName = markerUrl.substring('url("'.length, markerUrl.length - '#)'.length);
		if (!$(markerName).hasClass('finished')) {
			var marker = $(markerUrl.substring('url("'.length, markerUrl.length - '")'.length));
			var clone = marker.clone();
			clone.attr('id', marker.attr('id') + flowId);
			clone.addClass('finished');
			clone.insertAfter(marker);
			path.css('marker-end', 'url("#' + clone.attr('id') + '")');	
		}
	}
	
	function isCancelled(activity) {
		// TODO fetch procinst if type is callActivity and check end time and end activity,
		// if end time is not null but end activity is, then the activity was cancelled
		return isFinished(activity)
			&& activity.endActivityId === null;
	}
	
	function isFinished(activity) {
		return activity && activity.endTime !== null;
	}
	
	function isStarted(activity) {
		return activity && activity.startTime !== null;
	}
	
	function isParallelGateway(element) {
		return element.type === 'bpmn:ParallelGateway';
	}
	
	function isExclusiveGateway(element) {
		return element.type === 'bpmn:ExclusiveGateway';
	}
	
	function isFlow(element) {
		return element.type === 'bpmn:SequenceFlow';
	}
		
	return {
		load: load,
		addActivity: loadActivity,
		loadActivities: loadActivities
	}
}