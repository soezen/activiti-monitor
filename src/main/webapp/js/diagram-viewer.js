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
		var activityType = activity.activityType;
		var canvas = bpmnViewer.get('canvas');
		var registry = bpmnViewer.get('elementRegistry');
		var element = registry.get(activity.activityId);
		element.activity = activity;

		if (activityType === 'parallelGateway') {
			element.finished = element.incoming.length;
		} else if (activity.startTime && activity.endTime) {
			canvas.addMarker(activity.activityId, 'finished');
		} else if (activity.startTime) {
			canvas.addMarker(activity.activityId, 'running');
		}
		
		loadFlows(activity.activityId);
	}
	
	function loadFlows(activityId) {
		var registry = bpmnViewer.get('elementRegistry');
		var canvas = bpmnViewer.get('canvas');
		var element = registry.get(activityId);
		var flows = element.outgoing.concat(element.incoming);
		
		flows.forEach(function (flow) {
			
			if (isFlowTaken(flow)) {
				canvas.addMarker(flow, 'finished');
				colorEndMarker(flow.id);
				
				var target = flow.businessObject.targetRef;
				if (isParallelGateway(target)) {
					var targetElement = registry.get(target.id);
					targetElement.finished--;
					if (targetElement.finished == 0) {
						canvas.addMarker(target, 'finished');
						canvas.removeMarker(target, 'running');
					} else {
						canvas.addMarker(target, 'running');
					}
				}
			
			}
			
		});
		
	}
	
	function isFlowTaken(flow) {
		var source = flow.businessObject.sourceRef;
		var target = flow.businessObject.targetRef;
		
		return isParallelGateway(source)
			|| (hasFinishedMarker(source) 
				&& (!isExclusiveGateway(source) || hasFinishedMarker(target) || hasRunningMarker(target)));
	}
	
	function colorEndMarker(flowId) {
		var path = $('g[data-element-id=' + flowId + '] > .djs-visual > path');
		var markerUrl = path.css('marker-end');
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
	
	function hasFinishedMarker(element) {
		var canvas = bpmnViewer.get('canvas');
		return canvas.hasMarker(element.id, 'finished');
	}
	
	function hasRunningMarker(element) {
		var canvas = bpmnViewer.get('canvas');
		return canvas.hasMarker(element.id, 'running');
	}
	
	function isParallelGateway(element) {
		return element.$type === 'bpmn:ParallelGateway';
	}
	
	function isExclusiveGateway(element) {
		return element.$type === 'bpmn:ExclusiveGateway';
	}
		
	return {
		load: load,
		addActivity: loadActivity
	}
}