document.addEventListener("DOMContentLoaded", function(event) {
	
	//Extremely bare-bones video generation test-script (currently only works on firefox)
	//(could be improved by using timesteps instead of samples?)
	//(interlacing could also be added? maybe not?)
	//(2nd channel could be used for audio)
	//(50Hz and 60Hz toggle and/or manual frequency control)
	//(Volume/gain control)
	//(pixel interpolation)
	
	var samplesPerFrame = 3252, sampleRate = 192000;
	var videoWidth = 12, videoHeight = 271;
	
	widthMultiplier = 20;
	var videoCanvas = document.getElementById('videoCanvas');
	videoCanvas.width = videoWidth*widthMultiplier;
	videoCanvas.height = videoHeight;
	var videoRenderArea = videoCanvas.getContext('2d');
	videoRenderArea.scale(widthMultiplier,1);
	
	var videoButton = document.getElementById("videoButton");
	var videoOutputIsOn = false;
	
	var mouseX = 0, mouseY = 0, mouseDraw = false, mouseErase = false;
	var prevCursorX = 0, prevCursorY = 0;
	var videoPixelValue = 0.5;
	var gamma = 2.22;
	
	var videoNumber = document.getElementById("videoNumber");
	var outputNumber = document.getElementById("outputNumber");
	var videoSlider = document.getElementById("videoSlider");
	
	var videoInfo = document.getElementById("videoInfo");
	var mousePixel = 0;
	
	function ClampValue(value,min,max)
	{
		return Math.min(Math.max(value, min), max);
	}
	
	function UpdateVideoInfo()
	{
		videoInfo.value = 
		"FrameWidth:"+videoWidth+"\n"+
		"FrameHeight:"+videoHeight+"\n\n"+
		"Hfreq:"+(sampleRate/videoWidth).toFixed(2)+"Hz\n"+
		"Vfreq:"+(sampleRate/samplesPerFrame).toFixed(2)+"Hz\n\n"+
		"PixelRate:"+sampleRate+"Hz\n"+
		"PixelsPerFrame:"+samplesPerFrame+"\n\n"+
		"Gamma:"+gamma+"\n\n"+
		"Mouse X:"+mouseX+" Y:"+mouseY+"\n"+
		"Pixel:"+(mouseX+mouseY*videoWidth)+"\n"+
		"PixelValue:"+(mousePixel > 0 ? Math.pow(mousePixel,1/gamma) : mousePixel).toFixed(2)+"\n"+
		"PixelGamma:"+mousePixel.toFixed(5);
	}
	
	function UpdateVideoNumbers()
	{
		videoNumber.value = videoPixelValue;
		videoSlider.value = videoPixelValue*100;
		
		if(videoPixelValue > 0)
			outputNumber.value = Math.pow(videoPixelValue,gamma);
		else
			outputNumber.value = videoPixelValue;
	}
	
	videoNumber.oninput = function() {
		videoPixelValue = ClampValue(videoNumber.value, -1, 1);
		UpdateVideoNumbers();
	}
	videoSlider.oninput = function() {
		videoPixelValue = ClampValue(videoSlider.value/100, -1, 1);
		UpdateVideoNumbers();
	}
	
	var vsyncSampleCounter = 0;
	var hsyncSampleCounter = 0;
	
	var videoCtx = new AudioContext();
	var videoBuffer = videoCtx.createBuffer(1, samplesPerFrame, sampleRate);
	var videoSource;
	var videoData = new Float32Array(samplesPerFrame);
	
	function UpdateVideoData() {
		videoSource.buffer = videoBuffer; //You can change the buffer while it's being played?!
		window.requestAnimationFrame(function(){if(videoOutputIsOn)UpdateVideoData();});
		videoBuffer.copyToChannel(videoData, 0);
	}

	function StartVideoOutput() {
		videoSource = videoCtx.createBufferSource();
		videoSource.buffer = videoBuffer;
		videoSource.loop = true;
		videoSource.connect(videoCtx.destination);
		videoSource.start();
		
		UpdateVideoData();
	}
	
	videoButton.onclick = function() {
		if(!videoOutputIsOn) {
			videoOutputIsOn = true;
			videoButton.innerHTML = "Stop";
			
			StartVideoOutput();
		} else {
			videoOutputIsOn = false;
			videoButton.innerHTML = "Start";
			
			videoSource.stop();
		}
	}
	videoCanvas.addEventListener('mousemove', function(event) {
		mouseX = ClampValue(Math.floor((event.pageX-this.offsetLeft)/widthMultiplier), 0, videoWidth-1);
		mouseY = ClampValue(Math.floor(event.pageY-this.offsetTop), 0, videoHeight-1);
		
		MoveCursorPixel(mouseX,mouseY);
		if(mouseDraw || mouseErase)
			ChangeVideoPixel(mouseX,mouseY,!mouseErase);
	});
	
	videoCanvas.addEventListener('mousedown', function(event) {
		if(event.button == 0) {
			mouseDraw = true;
		} else {
			mouseErase = true;
		}
		ChangeVideoPixel(mouseX,mouseY,!mouseErase);
	});
	document.addEventListener('mouseup', function(event) {
		if(event.button == 0) {
			mouseDraw = false;
		} else {
			mouseErase = false;
		}
	});
	document.addEventListener('wheel', function(event) {
		videoPixelValue = ClampValue(videoPixelValue-Math.sign(event.deltaY)/100, -1, 1);
		UpdateVideoNumbers();
		MoveCursorPixel(mouseX,mouseY);
	});
	
	function SetVideoRenderFillStyle(newVideoPixelValue)
	{
		if(newVideoPixelValue > 0)
			videoRenderArea.fillStyle = "rgba("+newVideoPixelValue*255+","+newVideoPixelValue*255+","+newVideoPixelValue*255+",1)";
		else
			videoRenderArea.fillStyle = "rgba(0,0,"+(-newVideoPixelValue*255)+",1)";
	}
	
	function MoveCursorPixel(x,y)
	{
		var prevVideoPixelValue = videoData[prevCursorX+prevCursorY*videoWidth];
		
		if(prevVideoPixelValue > 0)
			SetVideoRenderFillStyle(Math.pow(prevVideoPixelValue,1/gamma));
		else
			SetVideoRenderFillStyle(prevVideoPixelValue);
		
		videoRenderArea.fillRect(prevCursorX, prevCursorY, 1, 1);
		
		SetVideoRenderFillStyle(videoPixelValue);
		videoRenderArea.fillRect(x, y, 1, 1);
		
		prevCursorX = x;
		prevCursorY = y;
		
		mousePixel = videoData[x+y*videoWidth];
		UpdateVideoInfo();
	}
	
	function ChangeVideoPixel(x,y,pixelOn)
	{	
		if(pixelOn) {
			SetVideoRenderFillStyle(videoPixelValue);
			videoRenderArea.fillRect(x, y, 1, 1);
			
			if(videoPixelValue > 0)
				videoData[x+y*videoWidth] = Math.pow(videoPixelValue,gamma);
			else
				videoData[x+y*videoWidth] = videoPixelValue;
		} else {
			videoRenderArea.fillStyle = "#000000";
			videoRenderArea.fillRect(x, y, 1, 1);
			
			videoData[x+y*videoWidth] = 0;
		}
		
		mousePixel = videoData[x+y*videoWidth];
		UpdateVideoInfo();
	}
	function InitializeVideoPixels()
	{
		for(var x = 0; x < videoWidth; x++) {
			for(var y = 0; y < videoHeight; y++) {
				var newVideoPixelValue = videoData[x+y*videoWidth];
		
				if(newVideoPixelValue > 0)
					SetVideoRenderFillStyle(Math.pow(newVideoPixelValue,1/gamma));
				else
					SetVideoRenderFillStyle(newVideoPixelValue);

				videoRenderArea.fillRect(x, y, 1, 1);
			}
		}
	}
	
	function InitializeSyncData() {
		var syncData = videoBuffer.getChannelData(0);
		for(var i = 0; i < videoBuffer.length; i++) {
			vsyncSampleCounter++;
			if(vsyncSampleCounter > samplesPerFrame-318) { //very simple vsync
				syncData[i] = -0.3;
				if(vsyncSampleCounter === samplesPerFrame) {
					vsyncSampleCounter = 0;
				}
			} else {
				hsyncSampleCounter++;
				if(hsyncSampleCounter === videoWidth) { //very simple hsync
					syncData[i] = -0.3;
					hsyncSampleCounter = 0;
				} else {
					syncData[i] = 0;
				}
			}
			videoData[i] = syncData[i];
		}
	}
	InitializeSyncData();
	InitializeVideoPixels();
	UpdateVideoNumbers();
	UpdateVideoInfo();
});