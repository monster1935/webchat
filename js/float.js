console.log('start');
$(document).ready(function(){
	
	function webchat_close() {
		//默认开始的时候webchat是关闭的，只有按钮展示
		$('.float-webchat').animate({
	      	right:'-900px'
	    }, 300, function(){
	      	$('.float-open').animate({
	        	right:'-1px'
	      	}, 300);
	    });

	}
	function webchat_open() {
		//打开webchat,按钮隐藏
		$('.float-open').animate({
	      	right:'-80px'
	    }, 300, function(){
	      	$('.float-webchat').animate({
	        	right:'0px'
	      	}, 300);
	    });
	   
	}
	
	$('.float-close').click(function(){
	    webchat_close();
	    return false;
	});
	$('.open-btn').click(function(){
	    webchat_open();
	    return false;
	});
	
	setTimeout(function(){webchat_close()},100);
	
});