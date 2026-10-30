
// ---- fastchart/0-sample.js ----
/////////////////////////////////////////////////////////////////////////
// Sample - one timestamped value of data. A signal is made of many 
// samples.
/////////////////////////////////////////////////////////////////////////


class Sample {

    constructor(time_in, value_in) { 
        this.time = time_in;
        this.value = value_in;
    }

}

// ---- fastchart/1-signal.js ----
/////////////////////////////////////////////////////////////////////////
// Signal - A set of samples with monotomically-increasing time.
/////////////////////////////////////////////////////////////////////////

class Signal {

    constructor(name_in, units_in) { 
        this.name = name_in;
        this.units = units_in;
        this.clearValues();
    }

    //Add a new sample to the signal 
    // Based on NT4 requirements, to not assume samples are added monotomically
    addSample(newSample){
        if(this.sampleList.length == 0){
            this.firstSampleTime = newSample.time;
        }
        this.latestSampleTime =  Math.max(newSample.time, this.latestSampleTime);
        
        var insIdx = this.getIndexOfTime(newSample.time)+1;
        this.sampleList.splice(insIdx, 0, newSample);
    }

    //Get all samples in a given time range. Might return empty if no samples present
    getSamples(startTime, endTime){
        var retList = [];
        var startIdx = this.getIndexOfTime(startTime);
        var endIdx = this.getIndexOfTime(endTime);


        if(startIdx != null && endIdx != null){
            for(var idx = startIdx; idx < endIdx; idx++){
                retList.push(this.sampleList[idx]);
            }    
        }

        return retList;
    }

    //Return the first sample at or after the given time.
    //Might return null if no sample is after given time.
    getSample(time_in){
        var retSample = null;
        var idx = this.getIndexOfTime(time_in);
        if(idx != null){
            retSample = this.sampleList[idx];
        }
        return retSample;
    }

    //Clear out all samples
    clearValues(){
        this.sampleList = []; //Assumed to be entered in monotomically-increasing order
        this.latestSampleTime = 0;
        this.firstSampleTime = 0;    
    }

    //Return the most-recently-added sample
    //Might return null if no sample has been added yet.
    getLatestSample(){
        if(this.sampleList.length > 0){
            return this.sampleList[this.sampleList.length-1];
        } else {
            return null;
        }
    }

    //Optimized timeseries arbitrary lookup
    // Looks horrible. Hopefully works better than linear search.
    getIndexOfTime(time_in){
        var len = this.sampleList.length;

        if(time_in <= this.firstSampleTime){
            return 0; //Edge case - user asks for sample before known time
        } else if (time_in >= this.latestSampleTime){
            return this.sampleList.length - 1; //Edge case - user asks for sample after known range
        } else {
            if(len >= 3){

                //Main algorithm - assume the points are roughly equally spaced and start guessing about where
                // we'd expect the requested point to be.
                var signalTimeSpan = this.latestSampleTime - this.firstSampleTime;
                if(signalTimeSpan > 0){
                    var guessIdx = Math.floor( (this.sampleList.length-1) * (time_in-this.firstSampleTime) / (signalTimeSpan));

                    while(true){ //return statements expected to kick out out of this loop.
                        var guessTime = this.sampleList[guessIdx].time;

                        if(guessTime > time_in){
                            //Guessed too high, look backward in list
                            var guessTimeNext = this.sampleList[guessIdx-1].time;
                            if(guessTimeNext < time_in){
                                //We found the right interval, return the upper bound.
                                return guessIdx;
                            } else {
                                //Not in this interval, keep going.
                                guessIdx = guessIdx - 1;
                                continue;
                            }

                        } else if (guessTime < time_in){
                            //Guessed too low, move forward in list
                            var guessTimeNext = this.sampleList[guessIdx+1].time;
                            if(guessTimeNext > time_in){
                                //We found the right interval, return the upper bound.
                                return guessIdx + 1;
                            } else {
                                //Not in this interval, keep going.
                                guessIdx = guessIdx + 1;
                                continue;
                            }

                        } else {
                            //hot dog got it spot on!
                            return guessIdx;
                        }
                    }


                } else {
                    return len-1; //Edge case - samples provided are all on the same timestamp - just return the most recently submitted one
                }
            } else if (len == 1 || len == 2){
                return len-1; //Edge Case - only one or two samples in the list. Above algorithm won't work well, so just return latest sample
            } else if(len == 0) {
                return null; //Edge case - no samples in list - return null
            }

        }


    }

}
// ---- fastchart/2-plottedSignal.js ----
/////////////////////////////////////////////////////////////////////////
// PlottedSignal - A signal, plus additional info for drawing it
// nicely. 
/////////////////////////////////////////////////////////////////////////

class PlottedSignal {

    constructor(signal_in, drawColor_in, valueAxis_in) { 
        this.signal = signal_in;

        this.selected = false;

        this.valueAxis = valueAxis_in;

        this.curColor = drawColor_in;

    }

    autoScale(startTime, endTime){
        var sampleList = this.signal.getSamples(startTime, endTime);
        this.valueAxis.autoScale(sampleList);
    }

    getSamples(startTime, endTime){
        var sampleList = this.signal.getSamples(startTime, endTime);
        return sampleList;
    }

    showValueAtTime(time_in){
        var sample = null;

        if(time_in == null){
            sample = this.signal.getLatestSample();
        } else {
            sample = this.signal.getSample(time_in);
        }

    }

}
// ---- fastchart/2-valueAxis.js ----
/////////////////////////////////////////////////////////////////////////
// ValueAxis - One 
/////////////////////////////////////////////////////////////////////////

class ValueAxis {

    constructor(units_in) { 
        this.units = units_in;
        this.minVal = null;
        this.maxVal = null;
    }

    resetScale(){
        this.minVal = null;
        this.maxVal = null;
    }

    autoScale(samples){
        samples.forEach(sample => {
            if(this.minVal == null){
                this.minVal = sample.value;
            } 
            if(this.maxVal == null){
                this.maxVal = sample.value;
            } 
            
            var span = this.maxVal - this.minVal;
            if(span == 0){
                span = 1;
            }
            var margin = span * 0.05;
            this.minVal = Math.min(sample.value - margin, this.minVal);
            this.maxVal = Math.max(sample.value + margin, this.maxVal);
        });
    }

}
// ---- fastchart/3-fastChart.js ----

class FastChart {
    //////////////////////////////////////
    // Public Class methods
    //////////////////////////////////////
    constructor(drawContainer_in) { 

        this.startTime = 0;
        this.endTime = 1;

        this.yMin = 0;
        this.yMax = 1;
        
        this.cursorTime = null;

        this.mouseoverAtTimeCallback = null; //expect to be set to a function by the top-level stripcharts functionality to sync all charts.

        this.zoomRangeDn = null;
        this.zoomRangeUp = null;

        this.zoomRangeUpdateCallback = null; //expect to be set to a function by the top-level stripcharts functionality to sync all charts.

        // Set up drawing canvas within provided div
        this.drawContainer = drawContainer_in;
        this.drawDiv = document.createElement('chartDrawDiv');
        this.drawContainer.appendChild(this.drawDiv);
        this.canvas = document.createElement('canvas');
        this.canvas.id     = this.drawDiv.id + "_canvas";
        this.drawDiv.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        //TODO - bring these back at some point, but with better handling for mobile devices
        //this.canvas.addEventListener('mousemove', this.mouseoverHandler.bind(this), false);
        //this.canvas.addEventListener('mouseleave', this.mouseleaveHandler.bind(this), false);
        //this.canvas.addEventListener('mouseup', this.mouseupHandler.bind(this), false);
        //this.canvas.addEventListener('mousedown', this.mousedownHandler.bind(this), false);
        //this.canvas.addEventListener("mousewheel", this.mousewheelHandler.bind(this), false);
        //this.canvas.addEventListener("DOMMouseScroll", this.mousewheelHandler.bind(this), false);

        
    }

    clearDrawing(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setTimeRange(startTime_in, endTime_in){
        this.startTime = startTime_in;
        this.endTime = endTime_in;
    }

    //////////////////////////////////////
    // Private, Helper methods
    //////////////////////////////////////



    recalcDrawConstants(numValueAxes){
        this.canvas.width  = this.drawContainer.offsetWidth;
        this.canvas.height = this.drawContainer.offsetHeight;

        //Drawing configurations

        this.AXIS_MARGIN = 10;
        this.VALUE_AXIS_WIDTH = 50;
        this.AXIS_Y_BOTTOM_MARGIN = 30;

        this.plotOriginX_px = Math.round(this.AXIS_MARGIN + this.VALUE_AXIS_WIDTH * numValueAxes);
        this.plotOriginY_px = Math.round(this.canvas.height - this.AXIS_Y_BOTTOM_MARGIN);

        this.xAxisLen_px = this.canvas.width - this.plotOriginX_px;
        this.yAxisLen_px = this.plotOriginY_px;

        this.dataMarkerCircleRadius = this.canvas.height * 0.005;

        this.cursorTime = null;

    }

    drawXMarkers(){
        this.getTickMarkList(this.startTime, this.endTime, 1.0).forEach(markerTime => {
            var xPos = this.timeToX_px(markerTime);
            this.ctx.strokeStyle = "#555555";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(xPos, 0);
            this.ctx.lineTo(xPos, this.plotOriginY_px);
            this.ctx.stroke();

            this.ctx.strokeStyle = "#555555";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(xPos, this.plotOriginY_px);
            this.ctx.lineTo(xPos, this.canvas.height);
            this.ctx.stroke();

            this.ctx.font = "18px monospace";
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = "#555555";
            this.ctx.textAlign = 'left';
            this.ctx.fillText(markerTime.toPrecision(3), xPos + 2, this.plotOriginY_px + 2);
        });

    }

    setCursorPos(newTime){
        this.cursorTime = newTime;
    }

    drawCursor(){
        if(this.cursorTime != null){
            var cursorPos = this.timeToX_px(this.cursorTime);
            this.ctx.strokeStyle = "#BBBB00";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(cursorPos, 0);
            this.ctx.lineTo(cursorPos, this.canvas.height);
            this.ctx.stroke();
        }
    }

    drawZoomBox(){
        if(this.zoomRangeDn != null && this.cursorTime != null){
            var zpx = this.timeToX_px(this.zoomRangeDn);
            var cpx = this.timeToX_px(this.cursorTime);
            this.ctx.fillStyle = "#FFFFBB";
            this.ctx.lineWidth = 0;
            this.ctx.moveTo(zpx, 0);
            this.ctx.lineTo(cpx, 0);
            this.ctx.lineTo(cpx, this.plotOriginY_px);
            this.ctx.lineTo(zpx, this.plotOriginY_px);
            this.ctx.lineTo(zpx, 0);
            this.ctx.fill();
        }
    }

    getTickMarkList(min, max, decimationFactor){
        var range = max - min;
        var orderOfMag = Math.pow(10.0, Math.floor(Math.log10(range)));
        var markerSpacing = 1;

        if (range / orderOfMag >= 5)
            markerSpacing = orderOfMag;
        else if (range / (orderOfMag / 2.0) >= 5)
            markerSpacing = orderOfMag / 2.0;
        else
            markerSpacing = orderOfMag / 5.0;

        markerSpacing *= decimationFactor;

        var markerStart = Math.ceil(min / markerSpacing) * markerSpacing;
        var markerCur = markerStart;
        var markerList = [];

        while(markerCur < max){
            markerList.push(markerCur);
            markerCur += markerSpacing;
        }
        return markerList;
    }

    
    drawSeries(sampleList, yMin, yMax, colorString_in, bold_in){
        if(sampleList.length > 2){
            this.ctx.strokeStyle = colorString_in;
            this.ctx.lineWidth = bold_in ? 5 : 3;
            this.ctx.beginPath();
            var x_px = this.timeToX_px(sampleList[0].time);
            var y_px = this.valToY_px(sampleList[0].value, yMin, yMax);
            this.ctx.moveTo(x_px, y_px);
            for(var sampIdx = 1; sampIdx < sampleList.length; sampIdx++){
                x_px = this.timeToX_px(sampleList[sampIdx].time);
                //this.ctx.lineTo(x_px, y_px); //uncomment to make a step-chart
                y_px = this.valToY_px(sampleList[sampIdx].value, yMin, yMax);
                this.ctx.lineTo(x_px, y_px);
            }
            this.ctx.stroke();

            if(sampleList.length < 75 && Math.abs(sampleList[0].time - this.startTime) < 1.0){
                //Draw individual data point markers
                this.ctx.fillStyle = colorString_in;
                for(var sampIdx = 0; sampIdx < sampleList.length; sampIdx++){
                    x_px = this.timeToX_px(sampleList[sampIdx].time);
                    y_px = this.valToY_px(sampleList[sampIdx].value, yMin, yMax);
                    this.ctx.beginPath();
                    this.ctx.arc(x_px, y_px, this.dataMarkerCircleRadius * (bold_in ? 3.0 : 1.0), 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }

        }
    }

    drawAxes(valueAxisMap){
        this.ctx.strokeStyle = "#555555";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        //X axis
        this.ctx.moveTo(this.AXIS_MARGIN, this.plotOriginY_px);
        this.ctx.lineTo(this.canvas.width, this.plotOriginY_px);
        this.ctx.stroke();


        //Y axes
        var vaIdx = 0;
        valueAxisMap.forEach( va => {
            var xPos = this.plotOriginX_px - vaIdx * this.VALUE_AXIS_WIDTH;
            this.ctx.moveTo(xPos, 0);
            this.ctx.lineTo(xPos, this.canvas.height);
            this.ctx.stroke();

            var yMin = va.minVal;
            var yMax = va.maxVal;

            // Units Label
            this.ctx.font = "15px monospace";
            this.ctx.textBaseline = 'middle';
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = "#555555";
            var labelXPos = xPos - this.VALUE_AXIS_WIDTH/8;
            var labelYPos = (this.plotOriginY_px + this.canvas.height)/2;
            this.ctx.save()
            this.ctx.translate(labelXPos,labelYPos)
            this.ctx.fillText(va.units,0,0);
            //todo - rotated text?
            this.ctx.restore()


            this.getTickMarkList(yMin, yMax, 2.0).forEach(markerVal => {
                var yPos = this.valToY_px(markerVal, yMin, yMax);
                this.ctx.strokeStyle = "#555555";
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(xPos - this.VALUE_AXIS_WIDTH/2.1, yPos);
                this.ctx.lineTo(xPos, yPos);
                this.ctx.stroke();
    
                this.ctx.save();
                this.ctx.translate(xPos - this.VALUE_AXIS_WIDTH/8, yPos);
                //this.ctx.rotate(-Math.PI/2);
                this.ctx.font = "12px monospace";
                this.ctx.textBaseline = 'bottom';
                this.ctx.textAlign = 'right';
                this.ctx.fillStyle = "#555555";
                this.ctx.fillText(markerVal.toPrecision(3), 2, -2);
                this.ctx.restore();

            });
            vaIdx++;

        });


    }


    ///////////////////////////////////
    // Mouse-over cursor Handlers
    mouseoverHandler(e){
        if(this.mouseoverAtTimeCallback != null){
            var time = this.xPxToTime(e.offsetX);
            if(time > this.startTime && time < this.endTime){
                this.mouseoverAtTimeCallback(time);
            } else {
                this.mouseoverAtTimeCallback(null);
            }
        }
    }

    mouseleaveHandler(e){
        if(this.mouseoverAtTimeCallback != null){
            this.mouseoverAtTimeCallback(null);
        }
        
        this.resetZoomRangeHandlers();

    }

    ///////////////////////////////////
    // Click-to-Zoom Handlers
    mousedownHandler(e){
        this.resetZoomRangeHandlers();

        //Save off the time where the user clicked down 
        var time = this.xPxToTime(e.offsetX);
        if(time > this.startTime && time < this.endTime){
            this.zoomRangeDn = time;
        } 
    }

    mouseupHandler(e){
        //Save off the time where the user released
        var time = this.xPxToTime(e.offsetX);
        if(time > this.startTime && time < this.endTime){
            this.zoomRangeUp = time;
        } else {
            this.zoomRangeUp = null;
        }

        if(this.zoomRangeDn != null && this.zoomRangeUp != null && this.zoomRangeDn != this.zoomRangeUp){
            //If this mouse-up produced a valid zoom range...
            var newZoomTimeStart = 0;
            var newZoomTimeEnd = 0;

            //order the up/down click points properly to range start/end
            if(this.zoomRangeDn < this.zoomRangeUp){
                newZoomTimeEnd = this.zoomRangeUp;
                newZoomTimeStart = this.zoomRangeDn;
            } else {
                newZoomTimeEnd = this.zoomRangeDn;
                newZoomTimeStart = this.zoomRangeUp;
            }

            //Execute callback to update charts as needed.
            if(this.zoomRangeUpdateCallback != null){
                this.zoomRangeUpdateCallback(newZoomTimeStart, newZoomTimeEnd);
            }
        }
        
        this.resetZoomRangeHandlers();

    }

    resetZoomRangeHandlers(){
        this.zoomRangeUp = null;
        this.zoomRangeDn = null;
    }

    ///////////////////////////////////
    // scroll-to-zoom handlers
    mousewheelHandler(e) {
        // cross-browser wheel delta
        var e = window.event || e;
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        

        //We should adjust the view extents based on the read-in mouse wheel scroll action

        //Calculate the zoom action center (presumed to be center of chart if not yet set)
        var center = (this.endTime + this.startTime)/2;
        if(this.cursorTime != null){
            center = this.cursorTime ;
        } 
        
        //Calculate the above/below center widths
        var old_right_size = this.endTime - center;
        var old_left_size = center - this.startTime;
        
        //Calculate a multiplicative factor (1.0 for no change, > 1.0 for more zoom, < 1.0 for less zoom)
        var scaler = (1-delta*0.1);
        
        //Apply the factor to the above/below center widths
        var new_right_size = old_right_size * scaler;
        var new_left_size = old_left_size * scaler;
        
        //calculate the new extents
        var newEndTime = center + new_right_size;
        var newStartTime = center - new_left_size;
        
        this.zoomRangeUpdateCallback(newStartTime, newEndTime);

    
        //Return false to prevent this mouse event we're handling here from scrolling the page
        if (e.preventDefault)e.preventDefault();
        return false;
    }


    ///////////////////////////////////
    // Pixel/time/value/units 
    xPxToTime(x_px_in){
        var frac = (x_px_in - this.plotOriginX_px)/(this.canvas.width- this.plotOriginX_px);
        return this.startTime + (this.endTime - this.startTime) * frac;
    }

    timeToX_px(time_in){
        var frac = (time_in - this.startTime)/(this.endTime - this.startTime);
        return this.plotOriginX_px + this.xAxisLen_px * frac;
    }

    valToY_px(val_in, yMin, yMax){
        var frac = (val_in - yMin)/(yMax - yMin);
        return this.plotOriginY_px - this.yAxisLen_px * frac; //Negative produces coordinate transform to pixel space
    }


  }
// ---- fastchart/4-plot.js ----
/////////////////////////////////////////////////////////////////////////
// Plot - collection of the fastChart object, plus the table which
// shows signal names and values, and a set of value axes.
/////////////////////////////////////////////////////////////////////////

class Plot {

    constructor(drawDiv_in) { 

        //Save off a reference to the relevant div
        this.drawDiv = drawDiv_in;

        // Init the plotted signals list to be empty
        this.plottedSignalsMap = new Map();
        this.valueAxesMap = new Map();
        this.numValueAxes = 0; //Note, this may be bigger than valueAxesMap.size to align with other charts.

        // External ranges to synchronize all plots in terms of what they show 
        // and what actually needs drawn on the screen at any given time.
        this.drawStartTime = 0;
        this.drawEndTime = 0;

        this.cursorTime = null;

        this.chart = new FastChart(this.drawDiv);

        //Create a list of default hues to use for coloring signals
        this.defaultHueList = [];
        for(var i = 0; i < 10; i++){
            this.defaultHueList.push((107 * i) % 360); //made up numbers to make some spread out colors or whatevs
        }
        this.colorCounter = 0;

    }

    setCursorPos(cursorTime_in){
        this.cursorTime = cursorTime_in;
    }

    setNumValueAxes(num_in){
        this.numValueAxes = Math.max(this.valueAxesMap.size, num_in);
    }

    drawDataToChart(){
        //Clear and reset plot
        this.chart.recalcDrawConstants(this.numValueAxes);
        this.chart.clearDrawing();

        //Calculate and set up min/max x and y ranges
        this.chart.setTimeRange(this.drawStartTime, this.drawEndTime);
        this.valueAxesMap.forEach(va => va.resetScale());
        this.plottedSignalsMap.forEach(ps => ps.autoScale(this.drawStartTime, this.drawEndTime));

        //Draw chart elements. Z order: first = back, last = front.
        this.chart.drawAxes(this.valueAxesMap);
        this.chart.setCursorPos(this.cursorTime);
        this.chart.drawZoomBox();
        this.chart.drawXMarkers();

        //Draw all non-selected signals
        this.plottedSignalsMap.forEach(ps => {
            if(ps.selected == false){
                var samples = ps.getSamples(this.drawStartTime,this.drawEndTime);
                this.chart.drawSeries(samples, ps.valueAxis.minVal, ps.valueAxis.maxVal, ps.curColor, ps.selected);
            }
        });

        //Draw selected signals
        this.plottedSignalsMap.forEach(ps => {
            if(ps.selected == true){
                var samples = ps.getSamples(this.drawStartTime,this.drawEndTime);
                this.chart.drawSeries(samples, ps.valueAxis.minVal, ps.valueAxis.maxVal, ps.curColor, ps.selected);
            }
        });

        this.chart.drawCursor();
        
    }

    addSignal(signal_in, color_in){
        if(!this.plottedSignalsMap.has(signal_in.name)){
            //Check if we already have an axis to put this on
            var newValueAxis = null;
            this.valueAxesMap.forEach(va => {
                if(va.units == signal_in.units){
                    newValueAxis = va;
                }
            });

            //If we didn't have an existing axis, make a new one
            if(newValueAxis == null){
                newValueAxis = new ValueAxis(signal_in.units);
                this.valueAxesMap.set(signal_in.units, newValueAxis);
            }

            var newPS = new PlottedSignal(signal_in, color_in, newValueAxis);
            this.plottedSignalsMap.set(signal_in.name, newPS);
        }
    }

    setDrawRange(startTime, endTime){
        this.drawStartTime = startTime;
        this.drawEndTime = endTime;
    }

    ////////////////////////////////////////////
    // Main Animation Loop & utilities
    mainAnimationLoop(){

        this.drawDataToChart();
        this.updateDisplayedValues();
     }

    updateDisplayedValues(){
        this.plottedSignalsMap.forEach(ps => {
            if(this.cursorTime == null){
                ps.showValueAtTime(null); //latest
            } else {
                ps.showValueAtTime(this.cursorTime);
            }
        })
    }

    ////////////////////////////////////////////
    // Signal mouse handlers

    mouseup = e => {

        var sigName = e.currentTarget.getAttribute("data:sigName");
        var ps = this.plottedSignalsMap.get(sigName);

        this.plottedSignalsMap.forEach(ps => { ps.colorChooser.hide()}); //always close out all color choosers on click.

        if(e.which == 1){
            //left click toggles selected
            ps.selected ^= true; //toggle
        } else if(e.which == 2){
            //Middle click removes
            this.removePlottedSignal(sigName);
        } else if(e.which == 3) {
            //Right click shows color chooser
            ps.colorChooser.show(e.pageX, e.pageY);
        }

        e.preventDefault();
    }

    click = e => {
        if(e.which == 2){
            //prevent signal remove from doing that scroll-with-mouse-move
            e.preventDefault();
        }
    }

    contextmenu = e => {
        //do nothing, action handled in mouseup
        e.preventDefault();
    }

}

// ---- utils/delay-line.js ----
class DelayLine
{
    constructor(num_samples) {
        this.items = [];
        this.desLen = num_samples;
    }
    
    addSample(val) {
        this.items.push(val)
        this.num_samples++;
    }

    getSample() {
        if(this.items.length >= this.desLen){
            return this.items.shift()
        } else {
            return 0;
        }
    }
}

// ---- utils/trapezoid-profile.js ----

class ProfileConstraints {
  // Represents the constraints we want the profiler to obey
  // Larger accelerations imply faster changes in velocity
  // Larger velocities allow the profile to be traversed quicker
  constructor(maxVel, maxAccel) {
    // Constraints of exactly 0 result in infinite times
    // Which causes math issues later on. Ensure constraints are reasonable here.
    this.maxVel = Math.max(maxVel, 1.0e-9);
    this.maxAccel = Math.max(maxAccel, 1.0e-9);
  }
}

class ProfileState {
  // Represents the relevant state that the profiler controls
  // This is a constant-acceleration profiler, so we only track
  // up to acceleration (not jerk)
  constructor(pos, vel, accel) {
    this.pos = pos;
    this.vel = vel;
    this.accel = accel;
  }
}

class TrapezoidProfile {
   // Implements a 1-dimensional constant acceleration motion profile
   // See implementation at https://github.com/wpilibsuite/allwpilib/blob/main/wpimath/src/main/java/edu/wpi/first/math/trajectory/TrapezoidProfile.java
   // Tutorial should track this code's implementation as closely as possible



    constructor(constraints) {
      this.constraints = constraints;

      this.isFlipped = false;
      this.currentState = new ProfileState(0.0,0.0,0.0); //Always assume starting from zero state. Works for this sim, not generally.
      this.goalState = this.currentState;
      this.initialState = this.currentState;

      this.endAccel = 0;
      this.endFullSpeed = 0;
      this.endDeccel = 0;
    }


    assignDirection(input) {
      // Flips signs as needed if the direction of the output is inverted
      let result = new ProfileState(input.pos, input.vel, input.accel);
      if(this.isFlipped){
        result.pos *= -1.0;
        result.vel *= -1.0;
        result.accel *= -1.0;
      }
      return result;
    }

    isFinished(curTime_s) {
      // Check if the given time is after the end of the profile or not
      return curTime_s >= this.endDeccel;
    }
  
    shouldFlipAcceleration(initialState, goalState) {
      // Detects case where the profiler needs to run "backward" from normal
      // This lets us keep the main implementation all "positive", but just invert
      // things right at the end of needed
      return initialState.pos > goalState.pos;
    }

    init(initialState, goalState) {
      this.isFlipped = this.shouldFlipAcceleration(initialState, goalState);
      this.currentState = this.assignDirection(initialState);
      this.initialState = this.assignDirection(initialState);
      this.goalState = this.assignDirection(goalState);
      if (this.currentState.vel > this.constraints.maxVel) {
        this.currentState.vel = this.constraints.maxVel;
      }
  
      let cutoffBeginTime = this.currentState.vel / this.constraints.maxAccel;
      let cutoffEndTime = goalState.vel / this.constraints.maxAccel;
      let accelTime = this.constraints.maxVel / this.constraints.maxAccel;

      let cutoffDistBegin = Math.pow(cutoffBeginTime, 2) * this.constraints.maxAccel / 2.0;
      let cutoffDistEnd =  Math.pow(cutoffEndTime, 2)  * this.constraints.maxAccel / 2.0;
  
      let fullTrapezoidDist = cutoffDistBegin + (goalState.pos - this.currentState.pos) + cutoffDistEnd;
      let fullSpeedDist = fullTrapezoidDist - Math.pow(accelTime, 2) * this.constraints.maxAccel;
  
      if (fullSpeedDist < 0.0) {
        accelTime = Math.sqrt(fullTrapezoidDist / this.constraints.maxAccel);
        fullSpeedDist = 0.0;
      }

      this.endAccel = accelTime - cutoffBeginTime;
      this.endFullSpeed = this.endAccel + fullSpeedDist / this.constraints.maxVel;
      this.endDeccel = this.endFullSpeed + accelTime - cutoffEndTime;
    }

    calculate(curTime_s, currentState) {

      this.currentState = this.assignDirection(currentState);

      // Start with a copy of the current state, and we'll modify it.
      let result = new ProfileState(this.currentState.pos, this.currentState.vel, this.currentState.accel);

      if (curTime_s < this.endAccel) {
        // Initial acceleration segment - speeding up
        result.accel = this.constraints.maxAccel;
        result.vel = curTime_s * this.currentState.accel;
        result.pos = (this.initialState.vel + curTime_s * this.currentState.accel / 2.0) * curTime_s;

      } else if (curTime_s < this.endFullSpeed) {
        // Cruise at max velocity
        result.accel = 0.0;
        result.vel = this.constraints.maxVel;
        result.pos = (this.initialState.vel + this.endAccel * this.constraints.maxAccel / 2.0) * this.endAccel + this.constraints.maxVel * (curTime_s - this.endAccel);

      } else if (curTime_s <= this.endDeccel) {
        // Deceleration before end of profile - slowing down
        let timeLeft = this.endDeccel - curTime_s;

        result.accel = -1.0 * this.constraints.maxAccel;
        result.vel = this.goalState.vel + (timeLeft) * this.constraints.maxAccel;
        result.pos = this.goalState.pos - (this.goalState.vel + timeLeft * this.constraints.maxAccel / 2.0) * timeLeft;

      } else {
        // After end of profile - just stay at goal
        result = this.goalState;
        result.accel = 0.0;

      }

      //Return the result, including direction inversion
      return this.assignDirection(result);
    }
  
  }
  
  
  
// ---- utils/util.js ----
function drawArrow(context, fromx, fromy, tox, toy, arrowWidth, color){
  //variables to be used when creating the arrow
  var headlen = 10;
  var angle = Math.atan2(toy-fromy,tox-fromx);

  context.save();
  context.strokeStyle = color;

  //starting path of the arrow from the start square to the end square
  //and drawing the stroke
  context.beginPath();
  context.moveTo(fromx, fromy);
  context.lineTo(tox, toy);
  context.lineWidth = arrowWidth;
  context.stroke();

  //starting a new path from the head of the arrow to one of the sides of
  //the point
  context.beginPath();
  context.moveTo(tox, toy);
  context.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
             toy-headlen*Math.sin(angle-Math.PI/7));

  //path from the side point of the arrow, to the other side point
  context.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),
             toy-headlen*Math.sin(angle+Math.PI/7));

  //path from the side point back to the tip of the arrow, and then
  //again to the opposite side point
  context.lineTo(tox, toy);
  context.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
             toy-headlen*Math.sin(angle-Math.PI/7));

  //draws the paths created above
  context.stroke();
  context.restore();
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const gaussian = (mean, stdev) => {
  let y2;
  let use_last = false;
  return function () {
    let y1;
    if (use_last) {
      y1 = y2;
      use_last = false;
    } else {
      let x1, x2, w;
      do {
        x1 = 2.0 * Math.random() - 1.0;
        x2 = 2.0 * Math.random() - 1.0;
        w = x1 * x1 + x2 * x2;
      } while (w >= 1.0);
      w = Math.sqrt((-2.0 * Math.log(w)) / w);
      y1 = x1 * w;
      y2 = x2 * w;
      use_last = true;
    }

    return mean + stdev * y1;
  }
}

const isNear = ([x1, y1], [x2, y2], tolerance) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy <= tolerance * tolerance;
}

const scalarMultiplyState = (scalar, [posRad, velRadPerS]) => {
  return [scalar * posRad, scalar * velRadPerS];
}

const addState = (...states) => {
  return states.reduce((prev, cur) => [prev[0] + cur[0], prev[1] + cur[1]]
  );
}

const secondOrderRK4 = (dstate, state, inputVolts, timestepS) => {
  // These are sometimes named "k1" etc
  const d1 = dstate(state, inputVolts);
  const d2 = dstate(addState(state, scalarMultiplyState(0.5 * timestepS, d1)), inputVolts);
  const d3 = dstate(addState(state, scalarMultiplyState(0.5 * timestepS, d2)), inputVolts);
  const d4 = dstate(addState(state, scalarMultiplyState(timestepS, d3)), inputVolts);

  return addState(state,
    scalarMultiplyState(timestepS / 6,
      addState(d1,
        scalarMultiplyState(2, d2),
        scalarMultiplyState(2, d3),
        d4)));
}

// ---- base/base-sim.js ----
class BaseSim {
  constructor(divIdPrefix, processVariableUnits) {
    this.divIdPrefix = divIdPrefix;
    this.speedGraph = null;
    this.voltsGraph = null;
    this.containerDiv = document.getElementById(divIdPrefix + "_container");
    let plotDrawDivVals = document.getElementById(divIdPrefix + "_plotVals");
    let plotDrawDivVolts = document.getElementById(divIdPrefix + "_plotVolts");

    // Set up process variable chart - two signals indicating "actual" and "desired"
    // values for the simulation
    this.procVarPlot = new Plot(plotDrawDivVals);
    this.procVarActualSignal = new Signal("Actual", processVariableUnits);
    this.procVarDesiredSignal = new Signal("Desired", processVariableUnits);
    this.procVarPlot.addSignal(this.procVarActualSignal, "purple");
    this.procVarPlot.addSignal(this.procVarDesiredSignal, "red");
    this.procVarPlot.setNumValueAxes(1);


    // Set up "volts" chart - indicates control effort applied to the system
    this.voltsPlot = new Plot(plotDrawDivVolts);
    this.voltsSignal = new Signal("Control Effort", "V");
    this.voltsPlot.addSignal(this.voltsSignal, "green");
    this.voltsPlot.setNumValueAxes(1);

    this.visualizationDrawDiv = document.getElementById(divIdPrefix + "_viz");

    this.animationStartTimeS = null;
    window.requestAnimationFrame((t) => this.animate(t));

    this.controlDrawDiv = document.getElementById(divIdPrefix + "_ctrls");

    this.animationReset = true;

    this.simRunning = true;

    this.curSimTimeS = 0.0;

    //Register mouseover & scrollwheel callbacks. 
    // This is still tentative, as these won't work if the sim is running
    this.procVarPlot.chart.mouseoverAtTimeCallback = this.onChartMouseOver.bind(this); 
    this.voltsPlot.chart.mouseoverAtTimeCallback = this.onChartMouseOver.bind(this); 
    this.procVarPlot.chart.zoomRangeUpdateCallback = this.onChartZoomAction.bind(this); 
    this.voltsPlot.chart.zoomRangeUpdateCallback = this.onChartZoomAction.bind(this); 
    

  }

  resetData() {

  }

  begin() {
    this.resetCustom(); //Callback to fixed point in specific sim classes
    this.procVarActualSignal.clearValues();
    this.procVarDesiredSignal.clearValues();
    this.voltsSignal.clearValues();
    this.curSimTimeS = 0.0;
    this.animationReset = true;
    this.simRunning = true;
  }

  end() {
    this.simRunning = false;
  }

  iterate(){
    this.iterateCustom(); //callback to fixed point in the specific sim class
  }

  animate(currentTimeMs) {

    //Main animation loop
    let currentTimeS = currentTimeMs / 1000.0;

    if (this.animationReset) {
      //Sim has restarted, reset things to nominal
      this.animationStartTimeS = currentTimeS;
      this.animationReset = false;
      this.procVarPlot.setDrawRange(0, this.simDurationS);
      this.voltsPlot.setDrawRange(0, this.simDurationS);
    }

    if(this.simRunning){
      //Calculate the current time index, looping once we get past the end of the simulated duration
      let animationTimeS = (currentTimeS - this.animationStartTimeS);

      //run the simulation up to the current animation time
      while(this.curSimTimeS <= animationTimeS && this.simRunning){
        this.iterate();
      }

      this.procVarPlot.setCursorPos(animationTimeS);
      this.voltsPlot.setCursorPos(animationTimeS);
    } 

    //Redraw only if visible.
    if(this.isInViewport()){
      this.visualization.drawDynamic();
      this.voltsPlot.drawDataToChart();
      this.procVarPlot.drawDataToChart();
    }


    // Tell the browser to animate another frame for us later
    window.requestAnimationFrame((t) => this.animate(t));
  }


  isInViewport() {
    const rect = this.containerDiv.getBoundingClientRect();
    var topIn = rect.top >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight);
    var bottomIn = rect.bottom >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    return topIn || bottomIn;
  }

  ///////////////////////////
  // Mouse Events

  onChartMouseOver(timeAtMouse){
    if(!this.simRunning){
        this.procVarPlot.setCursorPos(timeAtMouse);
        this.voltsPlot.setCursorPos(timeAtMouse);
    }
  }


  onChartZoomAction(startTime, endTime){
    if(!this.simRunning){
      this.procVarPlot.setDrawRange(startTime, endTime);
      this.voltsPlot.setDrawRange(startTime, endTime);
    } 
  }

}

// ---- base/base-visualization.js ----
class BaseVisualization {
  constructor(div_in) {
    this.drawDiv = div_in;

    div_in.style.position = "relative";

    this.animatedCanvas = document.createElement("canvas");
    this.staticCanvas = document.createElement("canvas");

    this.staticCanvas.style.position = "absolute";
    this.staticCanvas.style.top = "0px";
    this.staticCanvas.style.left = "0px";

    this.animatedCanvas.style.position = "absolute";
    this.animatedCanvas.style.top = "0px";
    this.animatedCanvas.style.left = "0px";

    this.teamNumber = Math.floor(Math.random() * 9999).toFixed(0);

    this.animatedCanvasContext = this.animatedCanvas.getContext("2d");
    this.staticCanvasContext = this.staticCanvas.getContext("2d");

    div_in.appendChild(this.staticCanvas);
    div_in.appendChild(this.animatedCanvas);

    this.updateSize();

    window.addEventListener("resize", this.updateSize.bind(this));
    window.addEventListener("load", this.updateSize.bind(this));

    this.position = 0;
    this.positionPrev = 0;
  }

  updateSize() {
    this.width = Math.min(this.drawDiv.offsetWidth, 500);
    this.height = Math.max(this.drawDiv.offsetHeight, 100);
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    this.animatedCanvas.width = this.width;
    this.animatedCanvas.height = this.height;
    this.drawStatic();
  }

  setCurTime(timeS) {
    this.timeS = timeS;
  }

  setCurPos(position) {
    this.position = position;
  }

  setCurSetpoint(setpoint) {
    this.setpoint = setpoint;
  }

  setCurOutput(output) {
    this.output = output;
  }

  setCurControlEffort(controlEffortVolts) {
    this.controlEffortVolts = controlEffortVolts;
  }

  drawStatic() {
    this.staticCanvasContext.clearRect(0, 0, this.width, this.height);

    this.drawStaticCustom();
  }

  drawDynamic() {
    this.animatedCanvasContext.clearRect(0, 0, this.width, this.height);

    this.drawDynamicCustom();
  }
}

// ---- plant/flywheel-plant.js ----
class FlywheelPlant{

    constructor() {

        // Constants related to plant model
        // Flywheel

        let mass = 0.55; //shooter wheel mass in Kg
        let radius = 0.0762; //3 inch radius, converted to meters

        // Gearbox
        let GEARBOX_RATIO = 5.0/1.0; // output over input - 5:1 gear ratio

        // 775 Pro Motor
        let Rc = 0.08; // Coil & Wiring Resistance in Ohms
        let Kt = 0.71/134; // Nm/A torque constant -  Calculated from Stall Torque/Stall Current
        let Kv = (12-(0.7*Rc))/(18730*2*3.14159/60); // V/(rad/s). Calculated from Vemf@FreeSpeed/(2pi/60*RPM@FreeSpeed). Steady-state Vemf = Vs - I@FreeSpeed*Rc, for Vs = 12

        // TODO: better comment and descriptive variable naming
        // Constants from the blog post equations
        this.C1 = 2 *  Kt / (mass * radius * radius * GEARBOX_RATIO * Rc);
        this.C2 = 2 * Kv * Kt / (mass * radius * radius * Rc);
        this.C3 = 2 / (mass * radius * radius);

        this.systemNoise = false;
        // Simulate 4 volt std dev system noise at the loop update frequency
        this.gaussianNoise = gaussian(0, 4);
    }

    init(Ts) {
        this.speed = 0;
        this.speedPrev = 0;
        this.curpositionRev = 0;
        this.Ts = Ts;
        this.ballEnterTime = 5.0;
        this.ballExitTime = null; // gets filled out if the ball does indeed exit in this sim.
        this.ballEnterWheelAngle = null;
    }

    update(t, inVolts) {
        //Simulate friction
        let extTrq = 0.0005*this.speedPrev;

        // Simulate system noise
        if (this.systemNoise && inVolts > 0) {
            // apply system noise
            inVolts += this.gaussianNoise();
        }

        if (t > this.ballEnterTime & this.ballExitTime == null){
            // ball is in contact with the flywheel

            if (this.ballEnterWheelAngle == null) {
                // First loop, init the enter angle
                this.ballEnterWheelAngle = this.curpositionRev;
            } 
            
            if (this.curpositionRev > this.ballEnterWheelAngle + 0.25) {
                // ball has just exited the flywheel.
                this.ballExitTime = t;
            } else {
                // ball is exerting force on the shooter wheel
                extTrq += this.speedPrev * 0.008;
            }
        }

        // Simulate main Plant behavior
        this.speed = (this.Ts*this.C1*inVolts - this.Ts*this.C3*extTrq + this.speedPrev)/(1+this.Ts*this.C2);
        if(this.speed < 0) {
            this.speed = 0;
        }

        this.curpositionRev += this.speed / 2.0 / Math.PI * this.Ts;

        this.speedPrev = this.speed;

    }

    getCurrentSpeedRPM() {
        return this.speed*60/2/Math.PI;
    }

    getCurrentPositionRad() {
        return this.curpositionRev * 2.0 * Math.PI;
    }
    

    getBallEnterTime() {
        return this.ballEnterTime;
    }

    setSystemNoise(enabled) {
        this.systemNoise = enabled;
    }
}
// ---- plant/turret-plant.js ----
class TurretPlant {
  constructor(TimestepS) {
    this.TimestepS = TimestepS;

    // Gains estimated by ReCalc (http://reca.lc) with the specs below
    // Vertical arm simulator used with kG ignored
    // motor: 1x REV Neo 550
    // gearing: 100:1
    // efficiency: 100
    // effective turret radius: 0.25 meters
    // effective turrent point mass: 1 kg
    this.kVVoltSecondPerRad = 0.2;
    this.kAVoltSecondSquaredPerRad = 0.03;

    this.state = [0, 0];

    this.systemNoise = false;
    // Simulate half volt std dev system noise at sim loop update frequency
    this.gaussianNoise = gaussian(0, 0.5);
  }

  acceleration([posRad, velRadPerS], inputVolts) {
    if (this.systemNoise) {
      inputVolts += this.gaussianNoise();
    }

    const EMFAcceleration = -this.kVVoltSecondPerRad * velRadPerS / this.kAVoltSecondSquaredPerRad;
    const controlEffortAcceleration = inputVolts / this.kAVoltSecondSquaredPerRad;
    const accelRadPerSSquared = EMFAcceleration + controlEffortAcceleration;

    return [velRadPerS, accelRadPerSSquared]
  }
  
  reset() {
    this.state = [0, 0];
  }

  update(inputVolts) {
    // Simulate system noise
    if (this.systemNoise && inputVolts > 0) {
      // apply system noise
      inputVolts += this.gaussianNoise();
    }

    this.state =
      secondOrderRK4((state, inputVolts) => this.acceleration(state, inputVolts),
      this.state,
      inputVolts,
      this.TimestepS);
  }

  getPositionRad() {
    return this.state[0];
  }

  setSystemNoise(enabled) {
    this.systemNoise = enabled;
  }
}

// ---- plant/vertical-arm-plant.js ----
class VerticalArmPlant {
  constructor(TimestepS) {
    this.TimestepS = TimestepS;

    // Gains estimated by ReCalc (http://reca.lc) with the specs below
    // motor: 1x REV Neo
    // gearing: 100:1
    // efficiency: 100
    // arm length: 1 meter
    // arm mass: 5 kg
    this.kGVolts = 1.75;
    this.kVVoltSecondPerRad = 1.95;
    this.kAVoltSecondSquaredPerRad = 0.18;

    this.state = [0, 0];

    this.systemNoise = false;
    // Simulate half volt std dev system noise at sim loop update frequency
    this.gaussianNoise = gaussian(0, 0.5);
  }

  acceleration([posRad, velRadPerS], inputVolts) {
    if (this.systemNoise) {
      inputVolts += this.gaussianNoise();
    }

    const gravityAcceleration = -this.kGVolts * Math.cos(posRad) / this.kAVoltSecondSquaredPerRad;
    const EMFAcceleration = -this.kVVoltSecondPerRad * velRadPerS / this.kAVoltSecondSquaredPerRad;
    const controlEffortAcceleration = inputVolts / this.kAVoltSecondSquaredPerRad;
    const accelRadPerSSquared = gravityAcceleration + EMFAcceleration + controlEffortAcceleration;

    return [velRadPerS, accelRadPerSSquared]
  }
  
  reset() {
    this.state = [0, 0];
  }

  update(inputVolts) {
    // Simulate system noise
    if (this.systemNoise && inputVolts > 0) {
      // apply system noise
      inputVolts += this.gaussianNoise();
    }

    this.state =
      secondOrderRK4((state, inputVolts) => this.acceleration(state, inputVolts),
      this.state,
      inputVolts,
      this.TimestepS);
  }

  getPositionRad() {
    return this.state[0];
  }

  setSystemNoise(enabled) {
    this.systemNoise = enabled;
  }
}

// ---- plant/vertical-elevator-plant.js ----
class VerticalElevatorPlant {
  constructor(TimestepS, heightM) {
    this.TimestepS = TimestepS;


    this.mass = 20.0; // in kg

    // Gains estimated by ReCalc (http://reca.lc) with the specs below
    // motor: 1x REV Neo
    // gearing: 3:1
    // Pulley Diameter: 1 in
    // efficiency: 75
    // moving mass: 20 kg
    this.kGVolts = 2.28;
    this.kVVoltSecondPerM = 3.07;
    this.kAVoltSecondSquaredPerM = 0.41;

    //Factor for loosely-modeled air resistance for some unmodeled disturbance
    // See https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/falling.html
    let r = 1.225; //Air density at sea level
    let Cd = 1.42; // Drag Coefficient for a hollow hemisphere pointed the "wrong way" into the wind
    let A = 1.5; //Exposed Area (m^2)
    this.airResistanceCoef = Cd * r * A / 2.0;

    
    //Maximum height the elevator travels to
    this.heightM = heightM;

    this.state = [0, 0];

    this.systemNoise = false;
    // Simulate half volt std dev system noise at sim loop update frequency
    this.gaussianNoise = gaussian(0, 0.5);
  }

  acceleration([posM, velMPerS], inputVolts) {
    if (this.systemNoise) {
      inputVolts += this.gaussianNoise();
    }

    const gravityAcceleration = -this.kGVolts / this.kAVoltSecondSquaredPerM;
    const EMFAcceleration = -this.kVVoltSecondPerM * velMPerS / this.kAVoltSecondSquaredPerM;
    const controlEffortAcceleration = inputVolts / this.kAVoltSecondSquaredPerM;
    const airResistanceAccel = -1.0 * Math.sign(velMPerS) * Math.pow(velMPerS, 2) * this.airResistanceCoef / this.mass;

    var springAccel = 0.0;
    var dashpotAccel = 0.0;

    //Apply hard-stops as a combo spring + dashpot
    if(posM > this.heightM){
      //Top limit
      springAccel = (posM - this.heightM) * -100000.0;
      dashpotAccel = -100.0 * velMPerS;
    } else if(posM < 0.0){
      //Bottom limit
      springAccel = (posM) * -100000.0;
      dashpotAccel = -100.0 * velMPerS;
    }

    const accelMPerSSquared = gravityAcceleration + EMFAcceleration + controlEffortAcceleration + airResistanceAccel + springAccel + dashpotAccel;  


    return [velMPerS, accelMPerSSquared]
  }
  
  reset() {
    this.state = [0, 0];
  }

  update(inputVolts) {
    // Simulate system noise
    if (this.systemNoise && inputVolts > 0) {
      // apply system noise
      inputVolts += this.gaussianNoise();
    }

    this.state =
      secondOrderRK4((state, inputVolts) => this.acceleration(state, inputVolts),
      this.state,
      inputVolts,
      this.TimestepS);
  }

  getPositionM() {
    return this.state[0];
  }

  setSystemNoise(enabled) {
    this.systemNoise = enabled;
  }
}

// ---- visualization/flywheel-visualization.js ----
class FlywheelVisualization extends BaseVisualization{

    constructor(div_in){
        super(div_in);
        this.ballInjected = false;
        this.ballExited = false;
    }

    drawStaticCustom(){

        this.wheelCenterX = 0.6*this.width;
        this.wheelCenterY = 0.6*this.height;

        this.wheelRadius =  Math.min(this.height, this.width) * 0.25;

        this.ballRadius = this.wheelRadius * 0.5;

        this.ballLoadTrackX = this.wheelCenterX - this.wheelRadius - this.ballRadius;
        this.ballLoadTrackYStart = this.wheelCenterY+this.wheelRadius+20;
        this.ballLoadTrackYEnd = this.wheelCenterY;

        this.ballLaunchTrackXStart = this.wheelCenterX;
        this.ballLaunchTrackXEnd = this.width;
        this.ballLaunchTrackY = this.wheelCenterY - this.wheelRadius - this.ballRadius;

        //Wheel
        this.staticCanvasContext.lineWidth = 4;
        this.staticCanvasContext.fillStyle="#DDDDDD"
        this.staticCanvasContext.strokeStyle = '#000000';
        this.staticCanvasContext.beginPath();
        this.staticCanvasContext.arc(this.wheelCenterX, this.wheelCenterY, this.wheelRadius, 0, 2 * Math.PI, false);
        this.staticCanvasContext.fill();
        this.staticCanvasContext.stroke();

        //Ball Guide Track - outer
        this.staticCanvasContext.lineWidth = 2;
        this.staticCanvasContext.strokeStyle = '#000000';
        this.staticCanvasContext.beginPath();
        this.staticCanvasContext.moveTo(this.ballLoadTrackX - this.ballRadius, this.ballLoadTrackYStart);
        this.staticCanvasContext.lineTo(this.ballLoadTrackX - this.ballRadius, this.ballLoadTrackYEnd);
        this.staticCanvasContext.arc(this.wheelCenterX, this.wheelCenterY, this.wheelRadius + this.ballRadius*2, Math.PI, Math.PI * 3/2, false);
        this.staticCanvasContext.stroke();
        
        //Ball Guide Track - inner load
        this.staticCanvasContext.beginPath();
        this.staticCanvasContext.moveTo(this.ballLoadTrackX + this.ballRadius, this.ballLoadTrackYStart);
        this.staticCanvasContext.lineTo(this.ballLoadTrackX + this.ballRadius, this.ballLoadTrackYEnd);
        this.staticCanvasContext.stroke();


    }

    setBallState(injected_in){
        this.ballInjected = injected_in;
    }

    drawDynamicCustom(){
        const positionRad = this.position;

        // todo: magic numbers again
        const setpointPlotScale = this.setpoint * 1/500 * this.wheelRadius;
        const outputPlotScale = this.output * 1/500 * this.wheelRadius;
        const controlEffortPlotScale = this.controlEffortVolts * 1/6 * this.wheelRadius;

        const vectorY = this.wheelCenterY - this.wheelRadius;
        const setpointEndX = this.wheelCenterX + setpointPlotScale;
        const outputEndX = this.wheelCenterX + outputPlotScale;
        const controlEffortEndX = this.wheelCenterX + controlEffortPlotScale;


        //Time Indicator
        this.animatedCanvasContext.fillStyle = "#000000";
        this.animatedCanvasContext.font = "bold 20px Arial";
        this.animatedCanvasContext.fillText(
        "t = " + this.timeS.toFixed(2) + " sec",
        0.05 * this.width,
        0.15 * this.height
        );

        let ballCenterX = 0;
        let ballCenterY = 0;

        //Calculate ball position - Very very rough state machine approximation.
        // Technically, the plant needs to run... almost the whole simulation. Or at least
        // some amount of time in the future to feed this algorithm, I think.
        // This hacky thing keeps the visitation reasonable, which is all we really need for now.
        if(!this.ballInjected){
            //Ball waiting to be launched
            let progFrac = 0.50;
            ballCenterX = this.ballLoadTrackX;
            ballCenterY = this.ballLoadTrackYStart + progFrac * (this.ballLoadTrackYEnd - this.ballLoadTrackYStart);
            this.ballExited = false;
            this.ballEnterAngle = null;
        } else {
            if(!this.ballExited){
                //Ball is in contact with the shooter and should move along with it
                if(this.ballEnterAngle == null){
                    //First loop of exit, calc entry wheel angle
                    this.ballEnterAngle = this.position;
                }    

                let ballDrawAngle = this.position - this.ballEnterAngle  + Math.PI;
                ballCenterX = this.wheelCenterX + (this.wheelRadius + this.ballRadius) * Math.cos(ballDrawAngle);
                ballCenterY = this.wheelCenterY + (this.wheelRadius + this.ballRadius) * Math.sin(ballDrawAngle);

                //Check for ball exit conditions
                if(this.position - this.ballEnterAngle > Math.PI/2){
                    this.ballExited = true;
                    this.ballExitSpeed = 2 * Math.PI * (this.wheelRadius + this.ballRadius) / 60 * this.output; //output assumed in RPM
                    this.ballExitTime = this.timeS;
                }

            } else {
                ballCenterX = this.ballLaunchTrackXStart + this.ballExitSpeed * (this.timeS - this.ballExitTime);
                ballCenterY = this.ballLaunchTrackY;
            }
        }


        let numSegments = 5;
        let segWidthRad = 0.3;

        for(let segIndex = 0; segIndex < numSegments; segIndex ++){

            let offset = segIndex * Math.PI * 2 / numSegments;

            this.animatedCanvasContext.lineWidth = 4;
            this.animatedCanvasContext.strokeStyle = '#000000';
            if(offset == 0){
                this.animatedCanvasContext.fillStyle="#FF0000";
            } else {
                this.animatedCanvasContext.fillStyle="#000000";
            }
            this.animatedCanvasContext.beginPath();
            this.animatedCanvasContext.moveTo(this.wheelCenterX,this.wheelCenterY);
            this.animatedCanvasContext.arc(this.wheelCenterX, this.wheelCenterY, this.wheelRadius, offset + positionRad - segWidthRad/2.0, offset + positionRad + segWidthRad/2.0, false);
            this.animatedCanvasContext.closePath();
            this.animatedCanvasContext.fill();
            this.animatedCanvasContext.stroke();
        }

        //Center Hub
        this.animatedCanvasContext.lineWidth = 1;
        this.animatedCanvasContext.fillStyle="#000000"
        this.animatedCanvasContext.strokeStyle = '#000000';
        this.animatedCanvasContext.beginPath();
        this.animatedCanvasContext.arc(this.wheelCenterX, this.wheelCenterY, 0.1*this.wheelRadius, 0, 2 * Math.PI, false);
        this.animatedCanvasContext.fill();
        this.animatedCanvasContext.stroke();

        //ball
        this.animatedCanvasContext.lineWidth = 1;
        this.animatedCanvasContext.fillStyle="#bbffbb"
        this.animatedCanvasContext.strokeStyle = '#000000';
        this.animatedCanvasContext.beginPath();
        this.animatedCanvasContext.arc(ballCenterX, ballCenterY, this.ballRadius, 0, 2 * Math.PI, false);
        this.animatedCanvasContext.fill();
        this.animatedCanvasContext.stroke();

        // Vector indicators
        if (setpointPlotScale * setpointPlotScale > 0) {
            drawArrow(this.animatedCanvasContext, this.wheelCenterX, vectorY, setpointEndX, vectorY, 8, "red");
        }
        if (outputPlotScale * outputPlotScale > 0) {
            drawArrow(this.animatedCanvasContext, this.wheelCenterX, vectorY, outputEndX, vectorY, 6, "purple")
        }
        if (controlEffortPlotScale * controlEffortPlotScale > 0) {
            drawArrow(this.animatedCanvasContext, this.wheelCenterX, vectorY, controlEffortEndX, vectorY, 4, "green")
        }
    }
}
// ---- visualization/turret-visualization.js ----
class TurretVisualization extends BaseVisualization {
  constructor(div_in, simulationTimestepS, getSimulationIndex, setSimulationSetpoint, beginSimulation) {
    super(div_in);

    // These kept as members for click-drag detection
    this.setpointX = 0.0;
    this.setpointY = 0.0;

    this.simulationTimestepS = simulationTimestepS;

    this.getSimulationIndex = getSimulationIndex;

    this.draggingSetpoint = false;

    this.setSimulationSetpoint = setSimulationSetpoint;
    this.beginSimulation = beginSimulation;

    this.animatedCanvas.addEventListener("mousedown", event => this.handleMouseDown(event));
    this.animatedCanvas.addEventListener("mousemove", event => this.handleMouseMove(event));
    this.animatedCanvas.addEventListener("mouseup", event => this.handleMouseUp(event));
  }

  getCursorPosition(event) {
    const rect = this.animatedCanvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y];
  }

  isNearSetpoint(mouseLocation) {
    return isNear(
      mouseLocation,
      [this.setpointX, this.setpointY],
      0.035 * this.height
    );
  }

  angleFromArmCenter([x, y]) {
    return -Math.atan2(y - this.turretCenterY, x - this.turretCenterX);
  }

  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();

    this.beginSimulation();

    const clickLocation = this.getCursorPosition(event);

    this.draggingSetpoint = true;

    this.setSimulationSetpoint(this.angleFromArmCenter(clickLocation));
  }

  handleMouseMove(event) {
    event.preventDefault();
    event.stopPropagation();

    const mouseLocation = this.getCursorPosition(event);

    if (this.draggingSetpoint) {
        this.setSimulationSetpoint(this.angleFromArmCenter(mouseLocation));
    }
  }

  handleMouseUp(event) {
    event.preventDefault();
    event.stopPropagation();

    this.draggingSetpoint = false;
  }

  drawStaticCustom() {
    this.turretCenterX = 0.5 * this.width;
    this.turretCenterY = 0.5 * this.height;

    this.turretRadiusPx = Math.min(this.width, this.height) * 0.4;
    this.staticCanvasContext.moveTo(this.width / 2, this.height / 2);

    // Center of turret
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.5 * this.width,
      0.5 * this.height,
      0.02 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fillStyle = "black";
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();

    // Turret circumference
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.5 * this.width,
      0.5 * this.height,
      this.turretRadiusPx,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.stroke();
  }

  drawDynamicCustom() {

    // todo: systematize magic numbers

    //Time Indicator
    this.animatedCanvasContext.fillStyle = "#000000";
    this.animatedCanvasContext.font = "bold 20px Arial";
    this.animatedCanvasContext.fillText(
      "t = " + this.timeS.toFixed(2) + " sec",
      0.05 * this.width,
      0.15 * this.height
    );

    this.clickTolerance = 0.5 * this.height;
    this.setpointIndicatorRadius = 0.035 * this.height;
    this.endEffectorIndicatorRadius = 0.03 * this.height;

    const setpointRad = this.setpoint;
    const positionRad = this.position;
    const controlEffortPlotScale = this.controlEffortVolts * 1.5/12 * this.turretRadiusPx;

    const turretFrontX =
      this.turretCenterX + this.turretRadiusPx * Math.cos(positionRad);
    const turretFrontY =
      this.turretCenterY - this.turretRadiusPx * Math.sin(positionRad);

    const controlEffortEndX = turretFrontX - controlEffortPlotScale * Math.sin(positionRad);
    const controlEffortEndY = turretFrontY - controlEffortPlotScale * Math.cos(positionRad);

    this.setpointX =
      this.turretCenterX + this.turretRadiusPx * Math.cos(setpointRad);
    this.setpointY =
      this.turretCenterY - this.turretRadiusPx * Math.sin(setpointRad);

    // Setpoint indicator
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.arc(
      this.setpointX,
      this.setpointY,
      0.035 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.animatedCanvasContext.fillStyle = "red";
    this.animatedCanvasContext.fill();

    // Control effort indicator
    if (controlEffortPlotScale * controlEffortPlotScale > 0) {
      drawArrow(this.animatedCanvasContext, turretFrontX, turretFrontY, controlEffortEndX, controlEffortEndY, 4, "green")
    }

    // Turret front
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.arc(
      turretFrontX,
      turretFrontY,
      0.03 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.animatedCanvasContext.fillStyle = "purple";
    this.animatedCanvasContext.fill();
  }
}

// ---- visualization/vertical-arm-visualization.js ----
class VerticalArmVisualization extends BaseVisualization {
  constructor(div_in, simulationTimestepS, getSimulationIndex, setSimulationSetpoint, beginSimulation) {
    super(div_in);

    // These kept as members for click-drag detection
    this.setpointX = 0.0;
    this.setpointY = 0.0;

    this.getSimulationIndex = getSimulationIndex;

    this.draggingSetpoint = false;

    this.setSimulationSetpoint = setSimulationSetpoint;
    this.beginSimulation = beginSimulation;

    this.animatedCanvas.addEventListener("mousedown", event => this.handleMouseDown(event));
    this.animatedCanvas.addEventListener("mousemove", event => this.handleMouseMove(event));
    this.animatedCanvas.addEventListener("mouseup", event => this.handleMouseUp(event));
  }

  getCursorPosition(event) {
    const rect = this.animatedCanvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y];
  }

  isNearSetpoint(mouseLocation) {
    return isNear(
      mouseLocation,
      [this.setpointX, this.setpointY],
      0.035 * this.height
    );
  }

  angleFromArmCenter([x, y]) {
    return -Math.atan2(y - this.armStartY, x - this.armStartX);
  }

  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();

    this.beginSimulation();

    const clickLocation = this.getCursorPosition(event);

    this.draggingSetpoint = true;

    this.setSimulationSetpoint(this.angleFromArmCenter(clickLocation));
  }

  handleMouseMove(event) {
    event.preventDefault();
    event.stopPropagation();

    const mouseLocation = this.getCursorPosition(event);

    if (this.draggingSetpoint) {
        this.setSimulationSetpoint(this.angleFromArmCenter(mouseLocation));
    }
  }

  handleMouseUp(event) {
    event.preventDefault();
    event.stopPropagation();

    this.draggingSetpoint = false;
  }

  drawStaticCustom() {
    //Supports
    this.staticCanvasContext.lineWidth = 5;
    this.staticCanvasContext.strokeStyle = "#000000";
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.moveTo(this.width / 2, this.height / 2);
    this.staticCanvasContext.lineTo(0.3 * this.width, 0.9 * this.height);
    this.staticCanvasContext.stroke();
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.moveTo(this.width / 2, this.height / 2);
    this.staticCanvasContext.lineTo(0.7 * this.width, 0.9 * this.height);
    this.staticCanvasContext.stroke();

    //Wheels
    this.staticCanvasContext.lineWidth = 5;
    this.staticCanvasContext.fillStyle = "#000000";
    this.staticCanvasContext.strokeStyle = "#444444";
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.2 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.5 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.8 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();

    //Bumpers
    this.staticCanvasContext.fillStyle = "blue";
    this.staticCanvasContext.fillRect(
      0.1 * this.width,
      0.88 * this.height,
      0.8 * this.width,
      0.07 * this.height
    );
    this.staticCanvasContext.fillStyle = "#FFFFFF";
    this.staticCanvasContext.font = "bold 22px Arial";
    this.staticCanvasContext.textAlign = "center";
    this.staticCanvasContext.fillText(
      this.teamNumber,
      0.5 * this.width,
      0.94 * this.height
    );
  }

  drawDynamicCustom() {
    // todo: systematize magic numbers

    //Time Indicator
    this.animatedCanvasContext.fillStyle = "#000000";
    this.animatedCanvasContext.font = "bold 20px Arial";
    this.animatedCanvasContext.fillText(
      "t = " + this.timeS.toFixed(2) + " sec",
      0.05 * this.width,
      0.15 * this.height
    );

    this.armStartX = 0.5 * this.width;
    this.armStartY = 0.5 * this.height;
    const armLenPx = Math.min(this.width, this.height) * 0.4;

    this.clickTolerance = 0.5 * this.height;
    this.setpointIndicatorRadius = 0.035 * this.height;
    this.endEffectorIndicatorRadius = 0.03 * this.height;

    const setpointRad = this.setpoint;
    const positionRad = this.position;
    const controlEffortPlotScale = this.controlEffortVolts * 1.5/12 * armLenPx;

    const armEndX =
      this.armStartX + armLenPx * Math.cos(positionRad);
    const armEndY =
      this.armStartY - armLenPx * Math.sin(positionRad);

    const controlEffortEndX = armEndX - controlEffortPlotScale * Math.sin(positionRad);
    const controlEffortEndY = armEndY - controlEffortPlotScale * Math.cos(positionRad);

    this.setpointX =
      this.armStartX + armLenPx * Math.cos(setpointRad);
    this.setpointY =
      this.armStartY - armLenPx * Math.sin(setpointRad);

    // Arm
    this.animatedCanvasContext.lineWidth = 6;
    this.animatedCanvasContext.strokeStyle = "grey";
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.moveTo(this.armStartX, this.armStartY);
    this.animatedCanvasContext.lineTo(armEndX, armEndY);
    this.animatedCanvasContext.stroke();

    // Shoulder Joint
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.arc(
      0.5 * this.width,
      0.5 * this.height,
      0.02 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.animatedCanvasContext.fillStyle = "black";
    this.animatedCanvasContext.fill();

    // Setpoint indicator
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.arc(
      this.setpointX,
      this.setpointY,
      0.035 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.animatedCanvasContext.fillStyle = "red";
    this.animatedCanvasContext.fill();

    // Control effort indicator
    if (controlEffortPlotScale * controlEffortPlotScale > 0) {
      drawArrow(this.animatedCanvasContext, armEndX, armEndY, controlEffortEndX, controlEffortEndY, 4, "green")
    }

    // End Effector
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.arc(
      armEndX,
      armEndY,
      0.03 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.animatedCanvasContext.fillStyle = "purple";
    this.animatedCanvasContext.fill();
  }
}

// ---- visualization/vertical-elevator-visualization.js ----
class VerticalElevatorVisualization extends BaseVisualization {
  constructor(div_in, simulationTimestepS, elevHeightM, getSimulationIndex, setSimulationSetpoint, beginSimulation) {
    super(div_in);

    this.getSimulationIndex = getSimulationIndex;

    this.draggingSetpoint = false;

    this.setSimulationSetpoint = setSimulationSetpoint;
    this.beginSimulation = beginSimulation;

    this.animatedCanvas.addEventListener("mousedown", event => this.handleMouseDown(event));

    this.elevBottom = this.height * 0.9;
    this.elevTop = this.height * 0.1;
    this.elevMaxHeightM = elevHeightM;

    this.bonks = []; // Array to store pops
    this.bonkLifetime = 35; // Duration before pop fully fades (adjust as needed)
  }

  // Method to draw a jagged polygon (comic-book punch style) around the text
  drawJaggedPolygon(x, y, radius, numVertices) {
    var fixedRandList = [0.234,0,0.523,0,0.692,0,0.442,0,0.2643,0,0.5962,0,0.343,0,0.7954,0];
    const context = this.animatedCanvasContext;
    context.fillStyle = "#CCCC00"; // Color for the jagged polygon (e.g., bright yellow)
    context.strokeStyle = "#000000"; 
    context.lineWidth = 2;
    context.beginPath();

    for (let i = 0; i < numVertices; i++) {
      // Randomness to create jagged effect
      const angle = (i / numVertices) * Math.PI * 2;
      const randomOffset = fixedRandList[i%fixedRandList.length]*30; // Semi-jaggedness
      const xOffset = Math.cos(angle) * (radius + randomOffset);
      const yOffset = Math.sin(angle) * (radius + randomOffset);

      if (i === 0) {
        context.moveTo(x + xOffset, y + yOffset); // Start the polygon path
      } else {
        context.lineTo(x + xOffset, y + yOffset); // Add vertices to the path
      }
    }

    context.closePath();
    context.stroke()
    context.fill()
  }

  // Method to add a "pop" at a random location
  addBonk() {
    const x = Math.random() * (this.width * 0.2) + this.width * 0.4; // Random x within constraints
    const y = Math.random() * (this.height * 0.3) + this.height * 0.1; // Random y within constraints
    this.bonks.push({ x, y, transparency: 1.0 }); // Start fully opaque
  }

  // Method to update the transparency of pops and remove if too transparent
  updateBonks() {
    this.bonks = this.bonks.filter((pop) => {
      pop.transparency -= 1 / this.bonkLifetime; // Decrease transparency over time
      return pop.transparency > 0; // Keep pop if still visible
    });
  }

  getCursorPosition(event) {
    const rect = this.animatedCanvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y];
  }

  setpointFromClick([x, y]) {
    return this.canvasToPos(y);
  }

  handleMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const clickLocation = this.getCursorPosition(event);
    this.draggingSetpoint = true;
    this.setSimulationSetpoint(this.setpointFromClick(clickLocation));
    this.beginSimulation();

  }

  posToCanvas(posIn){
    return posIn / this.elevMaxHeightM * (this.elevTop - this.elevBottom) + this.elevBottom;
  }

  canvasToPos(canvasYIn){
    return (canvasYIn - this.elevBottom) * this.elevMaxHeightM / (this.elevTop - this.elevBottom);
  }

  drawStaticCustom() {
    //Supports
    this.staticCanvasContext.lineWidth = 5;
    this.staticCanvasContext.strokeStyle = "#000000";
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.moveTo(this.width / 2, 0.9 * this.height);
    this.staticCanvasContext.lineTo(this.width / 2, 0.1 * this.height);
    this.staticCanvasContext.stroke();

    //Wheels
    this.staticCanvasContext.lineWidth = 5;
    this.staticCanvasContext.fillStyle = "#000000";
    this.staticCanvasContext.strokeStyle = "#444444";
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.2 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.5 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();
    this.staticCanvasContext.beginPath();
    this.staticCanvasContext.arc(
      0.8 * this.width,
      0.92 * this.height,
      0.06 * this.height,
      0,
      2 * Math.PI,
      false
    );
    this.staticCanvasContext.fill();
    this.staticCanvasContext.stroke();

    //Bumpers
    this.staticCanvasContext.fillStyle = "blue";
    this.staticCanvasContext.fillRect(
      0.1 * this.width,
      0.88 * this.height,
      0.8 * this.width,
      0.07 * this.height
    );
    this.staticCanvasContext.fillStyle = "#FFFFFF";
    this.staticCanvasContext.font = "bold 22px Arial";
    this.staticCanvasContext.textAlign = "center";
    this.staticCanvasContext.fillText(
      this.teamNumber,
      0.5 * this.width,
      0.94 * this.height
    );
  }

  drawDynamicCustom() {
    // todo: systematize magic numbers

    //Time Indicator
    this.animatedCanvasContext.fillStyle = "#000000";
    this.animatedCanvasContext.font = "bold 20px Arial";
    this.animatedCanvasContext.fillText(
      "t = " + this.timeS.toFixed(2) + " sec",
      0.05 * this.width,
      0.15 * this.height
    );

    this.armStartX = 0.5 * this.width;
    this.armStartY = 0.5 * this.height;

    this.clickTolerance = 0.5 * this.height;

    const setpointDraw = this.posToCanvas(this.setpoint);
    const positionDraw = this.posToCanvas(this.position);

    // Elevator
    const elevDrawWidth = this.width * 0.2;
    const elevDrawHeight = this.height * 0.1;
    this.animatedCanvasContext.lineWidth = 6;
    this.animatedCanvasContext.fillStyle = "purple";
    this.animatedCanvasContext.fillRect(
      this.width * 0.5 - elevDrawWidth/2, 
      positionDraw - elevDrawHeight/2,
      elevDrawWidth, 
      elevDrawHeight
    );

    // Control Effort
    const controlEffortPlotScale = this.controlEffortVolts / 12.0 * this.height * 0.75;
    // Control effort indicator
    if (Math.abs(this.controlEffortVolts) > 0.01) {
      drawArrow(this.animatedCanvasContext, 
        this.width * 0.5, 
        positionDraw, 
        this.width * 0.5, 
        positionDraw-controlEffortPlotScale, 
        4, "green")
    }

    // Setpoint
    this.animatedCanvasContext.lineWidth = 3;
    this.animatedCanvasContext.strokeStyle = "red";
    this.animatedCanvasContext.beginPath();
    this.animatedCanvasContext.moveTo(this.width * 0.3, setpointDraw);
    this.animatedCanvasContext.lineTo(this.width * 0.7, setpointDraw);
    this.animatedCanvasContext.stroke();

    //Bonk
    if(this.position >= 0.98 && this.positionPrev < 0.98){
      this.addBonk()
    }
    this.updateBonks()

    this.bonks.forEach((bonk) => {
      this.animatedCanvasContext.globalAlpha = bonk.transparency; // Set transparency

      // Draw jagged "cutout" shape behind the text
      this.drawJaggedPolygon(bonk.x, bonk.y, 20, 17); // Radius and vertices for jagged shape

      // Set text style and draw "Bonk!"
      this.animatedCanvasContext.fillStyle = "#FF0000";
      this.animatedCanvasContext.font = "bold 16px Comic Sans MS"; // Halved font size
      this.animatedCanvasContext.fillText("Bonk!", bonk.x - 20, bonk.y + 5); // Adjust text position to center it

      this.animatedCanvasContext.globalAlpha = 1.0; // Reset globalAlpha after drawing
   });
    // Reset globalAlpha to default
    this.animatedCanvasContext.globalAlpha = 1.0;

    this.positionPrev = this.position

  }



}

// ---- sim/flywheel-sim.js ----
class FlywheelSim extends BaseSim {
  constructor(div_id_prefix) {
    super(div_id_prefix, "RPM", 0, 1800);

    this.simDurationS = 10.0;
    this.simulationTimestepS = 0.005;
    this.controllerTimestepS = 0.02;

    // User-configured setpoints
    this.setpointVal = 300.0;
    this.setpointStepTime = 1.0;

    this.plant = new FlywheelPlant();

    this.visualization = new FlywheelVisualization(this.visualizationDrawDiv);
    this.visualization.drawStatic();
  }

  resetCustom() {
    this.plant.init(this.simulationTimestepS);

    this.timeS = Array(this.simDurationS / this.simulationTimestepS)
      .fill()
      .map((_, index) => {
        return index * this.simulationTimestepS;
      });

    this.visualization.setCurPos(0.0);
    this.visualization.setCurOutput(0.0);
    this.visualization.setCurTime(0.0);
    this.visualization.setCurSetpoint(0.0);
    this.visualization.setCurControlEffort(0.0);

    this.inputVolts = 0.0;
    this.nextControllerRunTime = 0;

    this.iterationCount = 0;

    this.speed_delay_line = new DelayLine(9); //models sensor lag

  }



  iterateCustom() {

    this.curSimTimeS = this.iterationCount * this.simulationTimestepS;

    var currentSetpoint = 0.0;
    if (this.curSimTimeS > this.setpointStepTime) {
      currentSetpoint = this.setpointVal;
    }

    var meas_speed = this.speed_delay_line.getSample();

    //Simulate Controller
    if (this.curSimTimeS >= this.nextControllerRunTime) {
      this.inputVolts = this.controllerUpdate(this.curSimTimeS, currentSetpoint, meas_speed);
      //Maintain separate sample rate for controller
      this.nextControllerRunTime += this.controllerTimestepS;
    }

    this.plant.update(this.curSimTimeS, this.inputVolts);

    this.speed_delay_line.addSample(this.plant.getCurrentSpeedRPM());


    this.procVarActualSignal.addSample(new Sample(this.curSimTimeS, this.plant.getCurrentSpeedRPM()));
    this.procVarDesiredSignal.addSample(new Sample(this.curSimTimeS, currentSetpoint));
    this.voltsSignal.addSample(new Sample(this.curSimTimeS, this.inputVolts));

    this.visualization.setBallState(this.curSimTimeS > this.plant.getBallEnterTime());
    this.visualization.setCurPos(this.plant.getCurrentPositionRad());
    this.visualization.setCurOutput(this.plant.getCurrentSpeedRPM());
    this.visualization.setCurTime(this.curSimTimeS);
    this.visualization.setCurSetpoint(currentSetpoint);
    this.visualization.setCurControlEffort(this.inputVolts);

    this.iterationCount++;

    if (this.iterationCount >= this.timeS.length) {
      this.end();
    }

  }

}

// ---- sim/turret-sim.js ----
class TurretSim extends BaseSim {
  constructor(divIdPrefix) {
    super(divIdPrefix, "Rad", -Math.PI * 1.25, Math.PI * 1.25);

    this.positionDelayLine = new DelayLine(49); //models sensor lag
    
    this.simDurationS = 5.0;
    this.simulationTimestepS = 0.005;
    this.controllerTimestepS = 0.02;

    // User-configured setpoints
    this.currentSetpointRad = 0.0;

    this.plant = new TurretPlant(this.simulationTimestepS);

    this.visualization = new TurretVisualization(
      this.visualizationDrawDiv,
      this.simulationTimestepS,
      () => this.iterationCount - 1,
      setpoint => this.setSetpointRad(setpoint),
      () => this.begin()
    );
    this.visualization.drawStatic();

    this.timeSinceLastControllerIteration = 0.0;

    this.accumulatedError = 0.0;
    this.previousError = 0.0;
    this.previousSetpoint = 0.0;

    //User-configured feedback
    this.kP = 0.0;
    this.kI = 0.0;
    this.kD = 0.0;

    //User-configured Feed-Forward
    this.kG = 0.0;
    this.kV = 0.0;

    this.inputVolts = 0.0;

    this.resetCustom();
  }

  setSetpointRad(setpoint) {
    this.currentSetpointRad = setpoint;
    document.getElementById(this.divIdPrefix + "_setpoint").value = setpoint;
  }

  resetCustom() {
    this.plant.reset();
    this.timeS = Array(this.simDurationS / this.simulationTimestepS)
      .fill()
      .map((_, index) => {
        return index * this.simulationTimestepS;
      });

    this.visualization.setCurPos(0.0);
    this.visualization.setCurTime(0.0);
    this.visualization.setCurSetpoint(0.0);
    this.visualization.setCurControlEffort(0.0);

    this.accumulatedError = 0.0;
    this.previousError = 0.0;
    this.previousSetpoint = 0.0;
    this.inputvolts = 0.0;
    this.iterationCount = 0;

    this.positionDelayLine = new DelayLine(50); //models sensor lag

  }

  iterateCustom() {

    this.curSimTimeS = this.timeS[this.iterationCount];

    let measuredPositionRad = this.positionDelayLine.getSample();

    // Update controller at controller freq
    if (this.timeSinceLastControllerIteration >= this.controllerTimestepS) {
      this.inputVolts = this.updateController(this.currentSetpointRad, measuredPositionRad);
      this.timeSinceLastControllerIteration = 0;
    } else {
      this.timeSinceLastControllerIteration = this.timeSinceLastControllerIteration + this.simulationTimestepS;
    }

    this.plant.update(this.inputVolts);

    this.positionDelayLine.addSample(this.plant.getPositionRad());

    this.procVarActualSignal.addSample(new Sample(this.curSimTimeS, this.plant.getPositionRad()));
    this.procVarDesiredSignal.addSample(new Sample(this.curSimTimeS, this.currentSetpointRad));
    this.voltsSignal.addSample(new Sample(this.curSimTimeS, this.inputVolts));

    this.visualization.setCurPos(this.plant.getPositionRad());
    this.visualization.setCurTime(this.curSimTimeS);
    this.visualization.setCurSetpoint(this.currentSetpointRad);
    this.visualization.setCurControlEffort(this.inputVolts);


    this.iterationCount++;

    if (this.iterationCount >= this.timeS.length) {
      this.end();
    }

  }

  updateController(setpoint, measurement) {

    // Calculate error, error derivative, and error integral
    let error = setpoint - measurement;
    const derivativeSetpoint =
      (setpoint - this.previousSetpoint) / this.controllerTimestepS;

    this.accumulatedError += error * this.controllerTimestepS;

    const derivativeError =
      (error - this.previousError) / this.controllerTimestepS;

    // PID + cosine feed-forward control law
    let controlEffortVolts =
      this.kG * Math.cos(setpoint) +
      this.kV * derivativeSetpoint +
      this.kP * error +
      this.kI * this.accumulatedError +
      this.kD * derivativeError;

    // Cap voltage at max/min of the physically possible command
    if (controlEffortVolts > 12) {
      controlEffortVolts = 12;
    } else if (controlEffortVolts < -12) {
      controlEffortVolts = -12;
    }

    this.previousError = error;
    this.previousSetpoint = setpoint;

    return controlEffortVolts;
  }

}

// ---- sim/vertical-arm-sim.js ----
class VerticalArmSim extends BaseSim {
  constructor(divIdPrefix) {
    super(divIdPrefix, "Rad", -Math.PI * 1.25, Math.PI * 1.25);

    this.positionDelayLine = new DelayLine(49); //models sensor lag
    
    this.simDurationS = 5.0;
    this.simulationTimestepS = 0.005;
    this.controllerTimestepS = 0.02;

    // User-configured setpoints
    this.currentSetpointRad = 0.0;

    this.plant = new VerticalArmPlant(this.simulationTimestepS);

    this.visualization = new VerticalArmVisualization(
      this.visualizationDrawDiv,
      this.simulationTimestepS,
      () => this.iterationCount - 1,
      setpoint => this.setSetpointRad(setpoint),
      () => this.begin()
    );
    this.visualization.drawStatic();

    this.timeSinceLastControllerIteration = 0.0;

    this.accumulatedError = 0.0;
    this.previousError = 0.0;
    this.previousSetpoint = 0.0;

    //User-configured feedback
    this.kP = 0.0;
    this.kI = 0.0;
    this.kD = 0.0;

    //User-configured Feed-Forward
    this.kG = 0.0;
    this.kV = 0.0;

    this.inputVolts = 0.0;

    this.resetCustom();
  }

  setSetpointRad(setpoint) {
    this.currentSetpointRad = setpoint;
    document.getElementById(this.divIdPrefix + "_setpoint").value = setpoint;
  }

  resetCustom() {
    this.plant.reset();
    this.timeS = Array(this.simDurationS / this.simulationTimestepS)
      .fill()
      .map((_, index) => {
        return index * this.simulationTimestepS;
      });

    this.visualization.setCurPos(0.0);
    this.visualization.setCurTime(0.0);
    this.visualization.setCurSetpoint(0.0);
    this.visualization.setCurControlEffort(0.0);

    this.accumulatedError = 0.0;
    this.previousError = 0.0;
    this.previousSetpoint = 0.0;
    this.inputvolts = 0.0;
    this.iterationCount = 0;

    this.positionDelayLine = new DelayLine(50); //models sensor lag

  }
  

  iterateCustom() {

    this.curSimTimeS = this.timeS[this.iterationCount];

    let measuredPositionRad = this.positionDelayLine.getSample();

    // Update controller at controller freq
    if (this.timeSinceLastControllerIteration >= this.controllerTimestepS) {
      this.inputVolts = this.updateController(this.currentSetpointRad, measuredPositionRad);
      this.timeSinceLastControllerIteration = 0;
    } else {
      this.timeSinceLastControllerIteration = this.timeSinceLastControllerIteration + this.simulationTimestepS;
    }

    this.plant.update(this.inputVolts);

    this.positionDelayLine.addSample(this.plant.getPositionRad());

    this.visualization.setCurPos(this.plant.getPositionRad());
    this.visualization.setCurTime(this.curSimTimeS);
    this.visualization.setCurSetpoint(this.currentSetpointRad);
    this.visualization.setCurControlEffort(this.inputVolts);

    this.procVarActualSignal.addSample(new Sample(this.curSimTimeS, this.plant.getPositionRad()));
    this.procVarDesiredSignal.addSample(new Sample(this.curSimTimeS, this.currentSetpointRad));
    this.voltsSignal.addSample(new Sample(this.curSimTimeS, this.inputVolts));

    this.iterationCount++;

    if (this.iterationCount >= this.timeS.length) {
      this.end();
    }
  }

  updateController(setpoint, measurement) {

    // Calculate error, error derivative, and error integral
    let error = setpoint - measurement;
    const derivativeSetpoint =
      (setpoint - this.previousSetpoint) / this.controllerTimestepS;

    this.accumulatedError += error * this.controllerTimestepS;

    const derivativeError =
      (error - this.previousError) / this.controllerTimestepS;

    // PID + cosine feed-forward control law
    let controlEffortVolts =
      this.kG * Math.cos(setpoint) +
      this.kV * derivativeSetpoint +
      this.kP * error +
      this.kI * this.accumulatedError +
      this.kD * derivativeError;

    // Cap voltage at max/min of the physically possible command
    if (controlEffortVolts > 12) {
      controlEffortVolts = 12;
    } else if (controlEffortVolts < -12) {
      controlEffortVolts = -12;
    }

    this.previousError = error;
    this.previousSetpoint = setpoint;

    return controlEffortVolts;
  }

}

// ---- sim/vertical-elevator-sim.js ----
class VerticalElevatorSim extends BaseSim {
  constructor(divIdPrefix) {
    super(divIdPrefix, "M", -0.5, 2.5);
    
    this.simDurationS = 5.0;
    this.simulationTimestepS = 0.005;
    this.controllerTimestepS = 0.02;

    this.elevHeightM = 1.0;

    this.plant = new VerticalElevatorPlant(this.simulationTimestepS, this.elevHeightM);

    this.visualization = new VerticalElevatorVisualization(
      this.visualizationDrawDiv,
      this.simulationTimestepS,
      this.elevHeightM,
      () => this.iterationCount - 1,
      setpoint => this.setSetpointM(setpoint),
      () => this.begin()
    );
    this.visualization.drawStatic();

    this.timeSinceLastControllerIteration = 0.0;

    this.accumulatedError = 0.0;
    this.previousPositionError = 0.0;

    //User-configured feedback
    this.kP = 0.0;
    this.kI = 0.0;
    this.kD = 0.0;

    //User-configured Feed-Forward
    this.kG = 0.0;
    this.kV = 0.0;
    this.kA = 0.0;

    //User-configured Profiling
    this.maxVelMps = 0.0;
    this.maxAccelMps2 = 0.0;

    this.inputVolts = 0.0;

    //Default starting setpoint
    this.goal = new ProfileState(0.0, 0.0, 0.0);

    // Reset at least once right at the start
    this.resetCustom();
  }

  setSetpointM(setpoint) {
    this.goal = new ProfileState(setpoint, 0.0, 0.0);
    document.getElementById(this.divIdPrefix + "_setpoint").value = setpoint;
  }

  resetCustom() {
    this.plant.reset();
    this.timeS = Array(this.simDurationS / this.simulationTimestepS)
      .fill()
      .map((_, index) => {
        return index * this.simulationTimestepS;
      });

    this.visualization.setCurPos(0.0);
    this.visualization.setCurTime(0.0);
    this.visualization.setCurSetpoint(0.0);
    this.visualization.setCurControlEffort(0.0);

    this.accumulatedError = 0.0;
    this.previousPositionError = 0.0;
    this.inputvolts = 0.0;
    this.iterationCount = 0;

    this.makeProfile()

    this.positionDelayLine = new DelayLine(13); //models sensor lag

  }
  
  makeProfile(){
    var constraints = new ProfileConstraints(this.maxVelMps, this.maxAccelMps2);
    this.profile = new TrapezoidProfile(constraints)
    this.start = new ProfileState(0.0,0.0,0.0);
    this.setpoint = this.start;
    this.profile.init(this.start, this.goal)
  }

  iterateCustom() {

    this.curSimTimeS = this.timeS[this.iterationCount];

    let measuredPositionM = this.positionDelayLine.getSample();

    // Update controller at controller freq
    if (this.timeSinceLastControllerIteration >= this.controllerTimestepS) {
      this.setpoint = this.profile.calculate(this.curSimTimeS, this.setpoint)
      this.inputVolts = this.updateController(this.setpoint, measuredPositionM);
      this.timeSinceLastControllerIteration = this.controllerTimestepS;
    } else {
      this.timeSinceLastControllerIteration = this.timeSinceLastControllerIteration + this.simulationTimestepS;
    }

    this.plant.update(this.inputVolts);

    this.positionDelayLine.addSample(this.plant.getPositionM());

    this.visualization.setCurPos(this.plant.getPositionM());
    this.visualization.setCurTime(this.curSimTimeS);
    this.visualization.setCurSetpoint(this.setpoint.pos);
    this.visualization.setCurControlEffort(this.inputVolts);

    this.procVarActualSignal.addSample(new Sample(this.curSimTimeS, this.plant.getPositionM()));
    this.procVarDesiredSignal.addSample(new Sample(this.curSimTimeS, this.setpoint.pos));
    this.voltsSignal.addSample(new Sample(this.curSimTimeS, this.inputVolts));

    this.iterationCount++;

    if (this.iterationCount >= this.timeS.length) {
      this.end();
    }
  }

  updateController(setpoint, measurement) {

    // Calculate error, error derivative, and error integral
    let positionError = setpoint.pos - measurement;

    this.accumulatedError += positionError * this.controllerTimestepS;

    const derivativeError =
      (positionError - this.previousPositionError) / this.controllerTimestepS;

    // PID + gravity/Profiled feed-forward control law
    let controlEffortVolts =
      this.kG  +
      this.kV * setpoint.vel +
      this.kA * setpoint.accel +
      this.kP * positionError +
      this.kI * this.accumulatedError +
      this.kD * derivativeError;

    // Cap voltage at max/min of the physically possible command
    if (controlEffortVolts > 12) {
      controlEffortVolts = 12;
    } else if (controlEffortVolts < -12) {
      controlEffortVolts = -12;
    }

    this.previousPositionError = positionError;

    return controlEffortVolts;
  }

}

// ---- ./flywheel-bangbang.js ----

class FlywheelBangBang extends FlywheelSim {

    constructor(div_id_prefix) {

        super(div_id_prefix);

        this.ctrl_Ts = 0.02;

        this.buildControlTable();

        this.begin();

    }

    buildControlTable(){

        let curRow;
        let label;
        let control;
        let input;

        let controlTable =  document.createElement("table");
        controlTable.classList.add("controlTable");
        this.controlDrawDiv.appendChild(controlTable);

        curRow = document.createElement("tr");
        label = document.createElement("td");
        label.innerHTML = "Setpoint";
        control = document.createElement("td");
        controlTable.appendChild(curRow);
        input = document.createElement("INPUT");
        input.setAttribute("type", "text");
        input.setAttribute("value", "300.0");
        //input.setAttribute("step", "10.0");
        input.onchange = function (event) {
            this.animationReset = true;
            this.setpointVal = parseFloat(event.target.value);
            this.begin();;
        }.bind(this);
        control.append(input)
        curRow.appendChild(label);
        curRow.appendChild(control);

    }

    controllerUpdate(time, setpoint, output){
        //bang-bang control
        if(output < setpoint){
            return 12.0;
        } else {
            return 0.0;
        }
    }

}


// ---- ./flywheel-pidf.js ----
class FlywheelPIDF extends FlywheelSim {
  constructor(divIdPrefix, controlStrategy) {
    super(divIdPrefix);

    this.accumulatedError = 0.0;
    this.previousError = 0.0;

    // User-configured feedback
    this.kP = 0.0;
    this.kI = 0.0;
    this.kD = 0.0;

    // User-configured Feed-Forward
    this.kV = 0.0;
    this.kS = 0.0;

    // Can be "feedforward", "feedback", or "both"
    this.controlStrategy = controlStrategy;

    this.buildControlTable();

    this.begin();

  }

  buildControlTable() {
    let curRow;
    let label;
    let control;
    let input;

    let controlTable = document.createElement("table");
    controlTable.classList.add("controlTable");
    this.controlDrawDiv.appendChild(controlTable);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "System Noise";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "checkbox");
    input.setAttribute("value", "false");
    input.setAttribute("id", "systemNoise");
    input.onclick = function (event) {
      this.animationReset = true;
      this.plant.setSystemNoise(document.getElementById("systemNoise").checked);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "Setpoint";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("value", "300.0");
    //input.setAttribute("step", "10.0");
    //input.setAttribute("max", "1800.0");
    //input.setAttribute("min", "0.0");
    input.onchange = function (event) {
      this.animationReset = true;
      this.setpointVal = parseFloat(event.target.value);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    // Display feedforward gain inputs
    if (
      this.controlStrategy == "feedforward" ||
      this.controlStrategy == "both"
    ) {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kV";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.00001");
      input.onchange = function (event) {
        this.animationReset = true;
        this.kV = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }

    if (this.controlStrategy == "feedback" || this.controlStrategy == "both") {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kP";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.001");
      input.onchange = function (event) {
        this.animationReset = true;
        this.kP = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kI";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.001");
      input.onchange = function (event) {
        this.animationReset = true;
        this.kI = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kD";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.001");
      input.onchange = function (event) {
        this.animationReset = true;
        this.kD = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }
  }

  controllerUpdate(time, setpoint, output) {
    //Handle Init
    if (time == 0.0) {
      this.accumulatedError = 0.0;
      this.previousError = 0.0;
    }

    //Calculate error, error derivative, and error integral
    let error = setpoint - output;

    this.accumulatedError += error * this.controllerTimestepS;

    let err_delta = (error - this.previousError) / this.controllerTimestepS;

    //PID + kv/ks control law
    let ctrlEffort =
      this.kV * setpoint +
      this.kS * Math.sign(setpoint) +
      this.kP * error +
      this.kI * this.accumulatedError +
      this.kD * err_delta;

    //Cap voltage at max/min of the physically possible command
    if (ctrlEffort > 12) {
      ctrlEffort = 12;
    } else if (ctrlEffort < -12) {
      ctrlEffort = -12;
    }

    this.previousError = error;

    return ctrlEffort;
  }
}

// ---- ./turret-pidf.js ----
class TurretPIDF extends TurretSim {
  constructor(divIdPrefix, controlStrategy) {
    super(divIdPrefix);

    // Can be "feedforward", "feedback", or "both"
    this.controlStrategy = controlStrategy;

    this.buildControlTable(divIdPrefix);

    this.begin();
  }

  buildControlTable(divIdPrefix) {
    let curRow;
    let label;
    let control;
    let input;

    let controlTable = document.createElement("table");
    controlTable.classList.add("controlTable");
    this.controlDrawDiv.appendChild(controlTable);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "System Noise";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "checkbox");
    input.setAttribute("value", "false");
    input.setAttribute("id", divIdPrefix + "_systemNoise");
    input.onclick = function (event) {
      this.plant.setSystemNoise(document.getElementById(divIdPrefix + "_systemNoise").checked);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "Setpoint";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("value", "0.0");
    input.setAttribute("id", divIdPrefix + "_setpoint");
    input.onchange = function (event) {
      this.currentSetpointRad = parseFloat(event.target.value);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    if (
      this.controlStrategy == "feedforward" ||
      this.controlStrategy == "both"
    ) {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kV";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kV = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }

    if (this.controlStrategy == "feedback" || this.controlStrategy == "both") {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kP";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kP = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kI";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kI = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kD";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.01");
      input.onchange = function (event) {
        this.kD = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }
  }
}

// ---- ./vertical-arm-pidf.js ----
class VerticalArmPIDF extends VerticalArmSim {
  constructor(divIdPrefix, controlStrategy) {
    super(divIdPrefix);

    // Can be "feedforward", "feedback", or "both"
    this.controlStrategy = controlStrategy;

    this.buildControlTable(divIdPrefix);

    this.begin();
  }

  buildControlTable(divIdPrefix) {
    let curRow;
    let label;
    let control;
    let input;

    let controlTable = document.createElement("table");
    controlTable.classList.add("controlTable");
    this.controlDrawDiv.appendChild(controlTable);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "System Noise";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "checkbox");
    input.setAttribute("value", "false");
    input.setAttribute("id", divIdPrefix + "_systemNoise");
    input.onclick = function (event) {
      this.plant.setSystemNoise(document.getElementById(divIdPrefix + "_systemNoise").checked);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "Setpoint";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("value", "0.0");
    input.setAttribute("id", divIdPrefix + "_setpoint");
    input.onchange = function (event) {
      this.currentSetpointRad = parseFloat(event.target.value);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    if (
      this.controlStrategy == "feedforward" ||
      this.controlStrategy == "both"
    ) {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kG";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kG = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kV";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kV = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }

    if (this.controlStrategy == "feedback" || this.controlStrategy == "both") {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kP";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kP = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kI";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kI = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kD";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.01");
      input.onchange = function (event) {
        this.kD = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }
  }
}

// ---- ./vertical-elevator-pidf.js ----
class VerticalElevatorPIDF extends VerticalElevatorSim {
  constructor(divIdPrefix, controlStrategy) {
    super(divIdPrefix);

    // Can be "feedforward", "feedback"
    this.controlStrategy = controlStrategy;

    this.buildControlTable(divIdPrefix);

    this.begin();
  }

  buildControlTable(divIdPrefix) {
    let curRow;
    let label;
    let control;
    let input;

    let controlTable = document.createElement("table");
    controlTable.classList.add("controlTable");
    this.controlDrawDiv.appendChild(controlTable);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "System Noise";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "checkbox");
    input.setAttribute("value", "false");
    input.setAttribute("id", divIdPrefix + "_systemNoise");
    input.onclick = function (event) {
      this.plant.setSystemNoise(document.getElementById(divIdPrefix + "_systemNoise").checked);
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);

    curRow = document.createElement("tr");
    label = document.createElement("td");
    label.innerHTML = "Setpoint";
    control = document.createElement("td");
    controlTable.appendChild(curRow);
    input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("value", "0.0");
    input.setAttribute("min", "0.0");
    input.setAttribute("max", "1.0");
    input.setAttribute("id", divIdPrefix + "_setpoint");
    input.onchange = function (event) {
      this.setSetpointM(parseFloat(event.target.value));
      this.begin();
    }.bind(this);
    control.append(input);
    curRow.appendChild(label);
    curRow.appendChild(control);


    if (
      this.controlStrategy == "feedforward" ||
      this.controlStrategy == "both"
    ) {

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "Profiler Max Velocity";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      input.setAttribute("id", divIdPrefix + "_maxvel");
      input.onchange = function (event) {
        this.maxVelMps = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
  
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "Profiler Max Acceleration";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      input.setAttribute("id", divIdPrefix + "_maxaccel");
      input.onchange = function (event) {
        this.maxAccelMps2 = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kG";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kG = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kV";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kV = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kA";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.0000001");
      input.onchange = function (event) {
        this.kA = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

    } else {
      this.maxAccelMps2 = 99999.0; // effectively no profiling
      this.maxVelMps = 99999.0; // effectively no profiling
    }

    if (this.controlStrategy == "feedback" || this.controlStrategy == "both") {
      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kP";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kP = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kI";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.1");
      input.onchange = function (event) {
        this.kI = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);

      curRow = document.createElement("tr");
      label = document.createElement("td");
      label.innerHTML = "kD";
      control = document.createElement("td");
      controlTable.appendChild(curRow);
      input = document.createElement("INPUT");
      input.setAttribute("type", "text");
      input.setAttribute("value", "0.0");
      //input.setAttribute("step", "0.01");
      input.onchange = function (event) {
        this.kD = parseFloat(event.target.value);
        this.begin();
      }.bind(this);
      control.append(input);
      curRow.appendChild(label);
      curRow.appendChild(control);
    }
  }
}
