
/*工具辅助类*/
var EventUtil={
		_eventsList:{},
		get:function(el){
			return document.getElementById(el);
		},
		on:function(eName, fn, scope){
			eName = eName.toLowerCase();
		 	if(typeof this._eventsList[eName]=="undefined"){
					this._eventsList[eName] = [];	
			}
		 	this._eventsList[eName].push({fn : fn || null, scope : scope || null});
		},
		
	   	fireEvent : function(){
	   		var args  = Array.prototype.slice.call(arguments);
	   		var eName = args.shift();
	   		eName = eName.toLowerCase();
	   		
	   		var list = this._eventsList[eName];
	   		//增加对list的判断，并报错，提示该事件并未注册
	   		if(typeof list=='undefined'){
	   			console.log(eName+'cannot find this event!');
	   			return;
	   		}
	   		
	   		for (var i = 0; i < list.length; i++)
	   		{
	   		    var dict  = list[i];
	   		    var fn    = dict.fn;
	   		    var scope = dict.scope;
	   		    fn.apply(scope || null, args);
	   		}
	   	},

	   	un:function(eName,fn){
		   	eName = eName.toLowerCase();
		   	if(typeof this._eventsList[eName]=='undefined'){
		       	return;
		   	}else{
		       	var index=this.indexOf(eName,fn);
		       	if(index>-1){
		           	var list=this._eventsList[eName];
		           	list.splice(index,1);
		       	}
		  	}
	   	},

	   	indexOf:function(eName,fn){
	       	if('undefined'==this._eventsList[eName]){
	           	return -1;
	       	}
	       	var list=this._eventsList[eName];
	       	fn=fn||'';

	       	for(var i=0;i<list.length;i++){
	          	var dict=list[i];
	           	var _fn=dict.fn||'';
	           	if(fn.toString()===_fn.toString()){
	               return i;
	           	}
	       	}
	      	return -1;
	   	},
	   	addHandler:function(obj, type, handler, scope){
	   		function fn(event) { 
				var evt = event ? event : window.event; 
				evt.target = event.target || event.srcElement; 
				return handler.apply(scope || this,arguments); 
			} 
			//这里为需要注册事件处理程序的对象定义一个保存事件的hash对象，并把事件处理程序和作用域保存在该事件类型的队列里面 
			obj.eventHash = obj.eventHash || {};
			(obj.eventHash [type] = obj.eventHash [type] || []).push({ "name": type, "handler": handler, "fn": fn, "scope": scope }); 
			if (obj.addEventListener) { 
				obj.addEventListener(type, fn, false); 
			} else if (obj.attachEvent) { 
				obj.attachEvent("on" + type, fn); 
			} else { 
				obj["on" + type] = fn; 
			} 
	   	},
	   	removeHandler:function(obj, type, handler, scope){
	   		obj.eventHash = obj.eventHash || {}; 
			var evtList = obj.eventHash [type] || [], len = evtList.length; 
			if (len > 0) { 
				for (; len--; ) { 
					var curEvtObj = evtList[len]; 
					if (curEvtObj.name == type && curEvtObj.handler === handler && curEvtObj.scope === scope) { 
						if (obj.removeEventListener) { 
							obj.removeEventListener(type, curEvtObj.fn, false); 
						} else if (obj.detachEvent) { 
							obj.detachEvent("on" + type, curEvtObj.fn); 
						} else { 
							obj["on" + type] = null; 
						} 
						evtList.splice(len, 1); 
						break; 
					} 
				} 
			} 
	   	},
};

var nodeURL="ws://192.168.2.176:807",
	fileURL="http://192.168.2.176:7070/";

//页面加载完毕后执行初始化的动作，程序逻辑上的入口
window.onload=function(){
	var webchat=new Webchat();
	webchat.init();//初始化聊天界面
	// webchat.initLogic();//初始化Logic
	webchat.initMessageEvent();//设置事件监听
};

/*

前台页面逻辑
 */
function Webchat(){

	this.userId="";//如果是匿名用户登陆，该值为空
	this.callId="";
	this.toAgent="000008400004011";//消息接收方Id（分机号码）
	this.toAgentId="";//坐席工号接收方
	this.vccId="";
	this.agent="";
	this.agentId='';
	this.msgId="0";
}

Webchat.prototype={
	constructor:Webchat,
	init:function(){
		//界面元素的绑定
		var sendBtn=document.getElementById('sendBtn');
	    EventUtil.addHandler(sendBtn,'click',this.onSendClick,this);
	    
	    var messageInput=document.getElementById('messageInput');
	    EventUtil.addHandler(messageInput,'keydown',this.onKeydownSend,this);
	    
	    var clearBtn=document.getElementById('clearBtn');
	    EventUtil.addHandler(clearBtn,'click',this.onClearBtnClick,this);
	    
	    var sendImage=document.getElementById('sendImage');
	    EventUtil.addHandler(sendImage,'change',this.onSendImageClick,this);
	   
	    
	    var sendFile=document.getElementById('sendFile');
	    EventUtil.addHandler(sendFile,'change',this.onSendFileClick);
	    this._initialEmoji(); // 初始化表情
	    
	    var emoji=document.getElementById('emoji');
	    EventUtil.addHandler(emoji,'click',this.onEmojiClick,this);
	    
	    var body=document.body;
	    
	    EventUtil.addHandler(body,'click',this.onBodyClick,this);
	    
	    
	    var emojiWrapper=document.getElementById('emojiWrapper');
	    EventUtil.addHandler(emojiWrapper,'click',this.onEmojiWrapperClick,this);
		
		
	},
	initLogic:function(){
		var logic=new Logic(nodeURL);
	},
	initMessageEvent:function(){
		EventUtil.on('displayRecMsg',this.displayRecMsg,this);
		EventUtil.on('regResolve',this.regResolve,this);
	    EventUtil.on('msgResolve',this.msgResolve,this);
	    EventUtil.on('transResolve',this.transResolve,this);
	},

	//界面事件处理函数
	onSendClick:function(){
		var messageInput = document.getElementById('messageInput');
	    msg = messageInput.innerHTML;
	    messageInput.innerHTML = "";
	    messageInput.focus();
	    if (msg.trim().length != 0) {
	    	//socket发送消息
	        msgId=String(parseInt(this.msgId)+1);
	        var time=getTime("yyMMddhhmmss");
	            var data={
	                'msgreq':{
	                    type:'01',//00微信，01webchat，03机器人
	                    timeStamp:time,
	                    msgId: msgId,
	                    eventCode:'p20',
	                    callId:this.callId,//会话ID
	                    msgType: '00',//00表示文本
	                    vccId:'400004'/*this.vccId*/,
	                    fromAgent: this.agent,
	                    fromAgentId:this.agentId,
	                    //toAgent:this.toAgent,
	                    toAgent:this.toAgent,
	                    toAgentId:this.toAgentId,   
	                    msg: msg,
	                    status:''
	                }
	            };
	        this._displayNewMsg('send',msg);
	        this._displayNewMsg('receive',msg);
	        //this.msgEvent.fireEvent('sendMsg',JSON.stringify(data));
	        
	    }else{
	    	this._showWarning();
	    }
	},
	onKeydownSend:function(e){
		//输入框快捷键支持，enter键发送
        if(e.keyCode==13&& e.ctrlKey){
            EventUtil.get('messageInput').innerHTML+="<br/>";
        }else if(e.keyCode==13){
            e.preventDefault();
            this.onSendClick();
            
        }
	},
	onClearBtnClick:function(){
		//添加清屏支持
        EventUtil.get('historyMsg').innerHTML="";
	},
	onSendImageClick:function(){

		var sendImage=document.getElementById('sendImage');
		if(sendImage.files.length>0){
			var file=sendImage.files[0];
			var form=new FormData();
			form.append('file',file);
			var xhr=new XMLHttpRequest();
			xhr.open('post',fileURL,true);
			xhr.onload=function(){
				log('文件上传完成！'); 
			}
			var that=this;
			xhr.onreadystatechange=function(){
				if(xhr.readyState==4&&xhr.status==200){
					result=xhr.responseText;
					//alert(result);
					//得到文件(图片)在服务器上的路径之后进行展示，并发送到坐席端进行展示
					that._displayImage('send',result);
					that.sendImage(result);
				}
			}
			xhr.send(form);
			
		}
		//此处拿到返回的URL，然后按照普通消息发送给对方
	},
	onSendFileClick:function(){

	},
	onEmojiClick:function(e){
        var emojiWrapper=EventUtil.get('emojiWrapper');
        emojiWrapper.style.display='block';
        e.stopPropagation();
	},
	onBodyClick:function(e){
		var emojiWrapper=EventUtil.get('emojiWrapper');
        target=e.target||e.srcElement;
        if(e.target!==emojiWrapper){
            emojiWrapper.style.display="none";
        }
	},
	onEmojiWrapperClick:function(e){
        var target=e.target||e.srcElement;
        if(target.nodeName.toLowerCase()=="img"){
            var msgInput=EventUtil.get('messageInput');
            msgInput.focus();
            var msg=this._showEmoji(msgInput.innerHTML+"[emoji:"+target.title+"]");
            msgInput.innerHTML=msg;
            
        }
	},


	// 辅助函数
	_showWarning:function(){
		//弹出消息框，提示发送的消息不能为空
        //弹出消息框，提示发送的消息不能为空
		var warning = document.getElementById('warning');
		warning.style.display = 'block';
		setTimeout("warning.style.display = 'none';",'1500');
	},

	_initialEmoji:function(){
		var emojiContainer = EventUtil.get('emojiWrapper'),
        docFragment = document.createDocumentFragment();
        for (var i = 75; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = './images/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);

	},
	_showEmoji:function(msg){
		var match, result = msg,
        reg = /\[emoji:\d+\]/g,
        emojiIndex, totalEmojiNum = EventUtil.get('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emojiShow" src="./images/emoji/' + emojiIndex + '.gif" />'); // todo:fix this in
                // chrome it will
                // cause a new
                // request for the
                // image
            };
        };
        return result;
	},
	_displayTime:function(){
		var container = EventUtil.get('historyMsg');
		var timeToDisplay = document.createElement('div');
		var date = new Date();
		var time = getTime("hh:mm:ss");
		timeToDisplay.innerHTML=time;
		timeToDisplay.className="time";
		container.appendChild(timeToDisplay);
	},
	_displayNewMsg:function(user,msg){
		this._displayTime();
		var container = EventUtil.get('historyMsg');
		//portrait
		var portrait=document.createElement('div');
		if(user=="send"){
		    portrait.className="imgRight";
		}else{
		    portrait.className="imgLeft";
		}
		
		container.appendChild(portrait);


		// arrow
		var arrow = document.createElement('div');
		if (user == 'send') {
		    arrow.className = 'arrowRight';
		} else {
		    arrow.className = 'arrowLeft';
		}
		container.appendChild(arrow);

		// send
		var send = document.createElement('div');
		msg = this._showEmoji(msg);
		send.innerHTML = msg;
		if (user == "send") send.className = 'send';
		else send.className = 'receive';
		container.appendChild(send);

		//clear float
		var clearfloat=document.createElement('div');
		clearfloat.className='clearfloat';
		container.appendChild(clearfloat);

		container.scrollTop = container.scrollHeight;
	},


	// 监听事件消息处理函数
	regResolve:function(data){
		if(data.status=='00'){
		    this.agent=data.agent;
		    //注册成功，展示问候语
		    msg="尊敬的顾客您好，请问有什么可以帮到您？";
		    this._displayNewMsg('receiver',msg);
		}else{
		    
		    alert('reg error!');
		}
	},
	displayRecMsg:function(data){
		//根据消息的状态进行展示
		if(data.status=='00'){
		    if(data.msgType=='00'){//文本内容的展示
		        this._displayNewMsg('receive',data.msg);
		    }else if(data.msgType=='01'){//图片的展示
		        this._displayImage('rec',data.msg);
		    }else{
		        //文件下载的展示
		        this._displayNewMsg('receive',data.msg);
		    }
		    
		}
		if(data.status=='13'){
		    alert('已经问题转接至其他坐席');
		}
	},
	msgResolve:function(){
		//根据服务器返回的消息进行不同的消息样式展示
		//状态：00=成功,01=失败,02=用户已断开,03=没有有效的坐席,
		//04=会话已过期,05=转发成功,08=消息格式错误,09=错误的事件号／操作码,
		//10=坐席转接中,11=坐席转接成功,12=坐席收到转接消息，需要获取会话记录,13=对话已经转到X坐席
		

		//记录本次会话的callId
		this.callId=data.callId;
		this.toAgent=data.toAgent;
		this.toAgentId=data.toAgentId;
	},


};




/*

中间层，负责前台页面与后台node进行交互
 */

function Logic(URL){
	this.URL=URL;
	this.initSocket();


}

Logic.prototype={
	constructor:Logic,
	initMsgEvent:function(){

		EventUtil.on('sendMsg',this.sendMsg,this);
		//this.msgEvent.on('guestReg',this.guestReg,this);
		/*添加监听ping测试事件*/
		EventUtil.on('Ping',this.pingTest,this);

	},
	initSocketEvents:function(){
		//注册回复事件
		EventUtil.on('regres',this.regres,this);
		//消息回复事件
		EventUtil.on('msgres',this.msgres,this);
		//消息接受事件
		EventUtil.on('msgreq',this.msgreq,this);
		//图片接收事件
		//this.socket.on('recImg',this.recImg.bind(this));
		//ping测试回复事件
		EventUtil.on('pong',this.pongRes,this);
	},
	initSocket:function(){
		this.socket=new WebSocket(this.URL);
		var that=this;
		this.socket.onopen=function(){
			console.log('connect success.');
			that.msgEvent.on('guestReg',this.guestReg,this);
			//连接成功后去注册消息
			that.reg();
		};
		this.socket.onmessage=function(msg){
			console.log('socket:onmessage');
			//console.log(msg);
	        var json = JSON.parse(msg.data);
	        console.log(json);
	        //判断是哪些事件
	       	
	        if(json.regres!==null&&json.regres!==undefined){
	        	msgEvent.fireEvent('regres',json.regres);
	        }else if(json.msgres!==null&&json.msgres!==undefined){
	        	msgEvent.fireEvent('msgres',json.msgres);
	        }else if(json.trnres!==null&&json.trnres!==undefined){
	        	msgEvent.fireEvent('trnres',json.trnres);
	        }else if(json.pong__!==null&&json.pong__!==undefined){
	        	msgEvent.fireEvent('pong',json.pong__);
	        }else if(json.msgreq!==null&&json.msgreq!==undefined){
	        	msgEvent.fireEvent('msgreq',json.msgreq);
	        }

		};
		this.socket.onerror=function(){
			console.log('socket:onerror');
		};
		this.socket.onclose=function(){
			console.log('socket:onclose');
		};
	},
	reg:function(){
	    var time = getTime("yyMMddhhmmss");
	    var data={
	        'regreq':{
	            msgId:'1',//暂时固定
	            type:'01',  
	            timeStamp:time,
	            eventCode:'p00',
	            vccId:'400004',//企业编号或者服务号，匿名用户需要实现配置企业号
	            agentType:'00',//00表示匿名用户，01表示坐席
	            agentId:'',
	            agent:'',
	            status:'00',//登陆状态
	            msg:'',
	        }
	    };
	    this.socket.send(JSON.stringify(data));
	},

	// 前台事件监听函数
	sendMsg:function(){
		this.socket.send(data);
	},

	// 后台socket事件
	// 
	// 
	// 
	// 接收注册消息的回执，取得agengId
	regres:function(data){
		EventUtil.fireEvent('regResolve',data);
	},
	//接收发送的消息的回执，根据消息的发送状态调整消息展示样式
	msgres:function(){
		this.msgEvent.fireEvent('msgResolve',data);
	},
	//接收来自对方的消息,给服务器返回信息，并展示消息
	msgreq:function(data){
		this.msgResponse(data);
		this.msgEvent.fireEvent('displayRecMsg',data);
	},
	msgReponse:function(){
		var time = getTime("yyMMddhhmmss");
		var dataRes={
			'msgres':{
				callId:data.callId,
				eventCode:"p21",
				fromAgent:data.fromAgent,
				fromAgentId:data.fromAgentId,
				msgId:data.msgId,
				msgType:data.msgType,
				status:data.status,
				timeStamp:time,
				toAgent:data.toAgent,
				toAgentId:data.toAgentId,
				type:data.type,
				vccId:data.vccId
			}
		};
		this.socket.send(JSON.stringify(dataRes));
	},



};
//辅助函数
//
//
//自定义的日志输出函数
function log(){
    var args=Array.prototype.slice.call(arguments);
    args.unshift("%c【webchat】： ","color:green");
    console.log.apply(console,args);
}


//日期格式化
function getTime(fmt){
    var date=new Date();
    var o = {
        "M+": date.getMonth() + 1,
        // 月份
        "d+": date.getDate(),
        // 日
        "h+": date.getHours(),
        // 小时
        "m+": date.getMinutes(),
        // 分
        "s+": date.getSeconds(),
        // 秒
        "q+": Math.floor((date.getMonth() + 3) / 3),
        // 季度
        "S": date.getMilliseconds()
        // 毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o) if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}