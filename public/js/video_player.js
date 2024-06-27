var vid, playbtn, seekslider, curtimetext, mutebtn, volumeslider, fullscreenbtn;
        function intializePlayer(){
            // Set object references
            vid = document.getElementById("my_video");
            playbtn = document.getElementById("playpausebtn");
            seekslider = document.getElementById("seekslider");
            curtimetext = document.getElementById("curtimetext");
            mutebtn = document.getElementById("mutebtn");
            volumeslider = document.getElementById("volumeslider");
            fullscreenbtn = document.getElementById("fullscreenbtn");
            // Add event listeners
            playbtn.addEventListener("click",playPause,false);
            seekslider.addEventListener("change",vidSeek,false);
            vid.addEventListener("timeupdate",seektimeupdate,false);
            mutebtn.addEventListener("click",vidmute,false);
            volumeslider.addEventListener("change",setvolume,false);
            fullscreenbtn.addEventListener("click",toggleFullScreen,false);
        }
        window.onload = intializePlayer;
        function playPause(){
            if(vid.paused){
                vid.play();
                playbtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                vid.pause();
                playbtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        }
        function vidSeek(){
            var seekto = vid.duration * (seekslider.value / 100);
            vid.currentTime = seekto;
        }
        function seektimeupdate(){
            var nt = vid.currentTime * (100 / vid.duration);
            seekslider.value = nt;
            var curmins = Math.floor(vid.currentTime / 60);
            var cursecs = Math.floor(vid.currentTime - curmins * 60);
            if(cursecs < 10){ cursecs = "0"+cursecs; }
            if(curmins < 10){ curmins = "0"+curmins; }
            curtimetext.innerHTML = curmins+":"+cursecs;
        }
        function vidmute(){
            if(vid.muted){
                vid.muted = false;
                mutebtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            } else {
                vid.muted = true;
                mutebtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            }
        }
        function setvolume(){
            vid.volume = volumeslider.value / 100;
        }
        function toggleFullScreen(){
            if(vid.requestFullScreen){
                vid.requestFullScreen();
            } else if(vid.webkitRequestFullScreen){
                vid.webkitRequestFullScreen();
            } else if(vid.mozRequestFullScreen){
                vid.mozRequestFullScreen();
            }
        }