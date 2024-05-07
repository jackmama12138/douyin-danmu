// JavaScript版本
const axios = require('axios');
const WebSocket = require('ws');
const ProtoBufJs = require("protobufjs");
const path = require('path');
const zlib = require('zlib')
const DouyinLoader = ProtoBufJs.loadSync(path.join(__dirname, './dy.proto'));
const WebcastPushFrame = DouyinLoader.lookupType("douyin.PushFrame");
const {DouyinLoaders} = require('./commonFunction')

class DouyinLiveWebFetcher {
	constructor(liveId) {
		this.roomId = null;
		this.emptyCount = 0
		this.liveId = liveId;
		this.liveUrl = "https://live.douyin.com/";
		this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
	}

	async start() {
		await this._connectWebSocket();
	}

	stop() {
		this.ws.close();
	}

	async getTtwid() {
		const headers = {
			"User-Agent": this.userAgent,
		};
		try {
			const response = await axios.get(this.liveUrl, { headers });
			// console.log(response)
			// if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
			// console.log(response.headers['set-cookie'][0].split(';')[0].trim())
			return response.headers['set-cookie'][0].split(';')[0].trim();
			// return '1%7CZFC6mQSWF27j17Yj-GEXowkEqIxOVIN3OaxLVBUUPm8%7C1713027413%7C70163f8b61c101a822646f647c4d213af8421453cd472f841e1d6c4cbb56bc10;'
		} catch (err) {
			console.error("【X】Request the live url error:", err);
		}

	}

	async getRoomId() {
		if (this.roomId) return this.roomId;

		const url = this.liveUrl + this.liveId;
		const headers = {
			"User-Agent": this.userAgent,
			"Cookie": `ttwid=${await this.getTtwid()}; msToken=${this._generateMsToken()};__ac_nonce=0123407cc00a9e438deb4`,
		};

		try {
			const response = await axios.get(url, { headers });
			// console.log(response)
			// if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

			const match = response.data.match(/roomId\\":\\"(\d+)\\"/);
			// console.log(match)
			if (!match || match.length < 2) {
				console.error("【X】No match found for roomId");
			}
			// console.log('room',match[1])
			this.roomId = match[1];
			// this.roomId = '7366323378506058537';
			return this.roomId;
		} catch (err) {
			console.error("【X】Request the live room url error:", err);
		}
	}

	_generateMsToken(length = 107) {
		const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789=_";
		let token = "";
		for (let i = 0; i < length; i++) {
			token += chars[Math.floor(Math.random() * chars.length)];
		}
		return token;
	}

	async _connectWebSocket() {
		const ttwid = await this.getTtwid();
		const roomId = await this.getRoomId();
		// console.log('ttwid',ttwid)
		// console.log('roomid',roomId)
		const wssUrl = `wss://webcast3-ws-web-lq.douyin.com/webcast/im/push/v2/?` +
			`app_name=douyin_web&version_code=180800&webcast_sdk_version=1.3.0&update_version_code=1.3.0` +
			`&compress=gzip` +
			`&internal_ext=internal_src:dim|wss_push_room_id:${roomId}|wss_push_did:${roomId}` +
			'|dim_log_id:202302171547011A160A7BAA76660E13ED|fetch_time:1676620021641|seq:1|wss_info:0-1676' +
			'620021641-0-0|wrds_kvs:WebcastRoomStatsMessage-1676620020691146024_WebcastRoomRankMessage-167661' +
			'9972726895075_AudienceGiftSyncData-1676619980834317696_HighlightContainerSyncData-2' +
			`&cursor=t-1676620021641_r-1_d-1_u-1_h-1` +
			`&host=https://live.douyin.com&aid=6383&live_id=1` +
			`&did_rule=3&debug=false&endpoint=live_pc&support_wrds=1&` +
			`im_path=/webcast/im/fetch/&user_unique_id=${roomId}&` +
			`device_platform=web&cookie_enabled=true&screen_width=1440&screen_height=900&browser_language=zh&` +
			`browser_platform=MacIntel&browser_name=Mozilla&` +
			`browser_version=5.0%20(Macintosh;%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20` +
			'like%20Gecko)%20Chrome/110.0.0.0%20Safari/537.36&' +
			`browser_online=true&tz_name=Asia/Shanghai&identity=audience&` +
			`room_id=${roomId}&heartbeatDuration=0&signature=00000000`;


		const ws = new WebSocket(wssUrl, {
			headers: {
				'Cookie': `${ttwid}`,
				'User-Agent': this.userAgent,
			},
		});

		ws.on('open', () => {
			// console.log("WebSocket connected.");
			//todo
			const result = WebcastPushFrame.create({ payloadType: 'hb' });
			let paramBuffer = WebcastPushFrame.encode(result).finish();
			paramBuffer = Buffer.from(paramBuffer);
			// console.log(paramBuffer)
			ws.send(paramBuffer)
			// console.log('[ping] [💗发送ping心跳] [房间Id：' + liveRoomId + '] ====> 房间🏖标题【' + '】')
			let interval = setInterval(async () => {
				const result = WebcastPushFrame.create({ payloadType: 'hb' });
				let paramBuffer = WebcastPushFrame.encode(result).finish();
				paramBuffer = Buffer.from(paramBuffer);
				ws.send(paramBuffer)
				// console.log('[ping] [💗发送ping心跳] [房间Id：' + liveRoomId + '] ====> 房间🏖标题【' + '】')
				if (this.emptyCount > 600) {
					clearInterval(interval)
					ws.close();
				}
			}, 10000)
		});

		ws.on('message', (data) => {
			const packageStr =  DouyinLoaders.WebcastPushFrame.decode(data);
			const response = DouyinLoaders.WebcastResponse.decode(new Uint8Array(zlib.gunzipSync(packageStr.payload)))

			if (response.needAck) {
				const result = DouyinLoaders.WebcastPushFrame.create({ payloadType: response.internalExt, logId: packageStr.logId });
				let paramBuffer = DouyinLoaders.WebcastPushFrame.encode(result).finish();
				paramBuffer = Buffer.from(paramBuffer);
				ws.send(paramBuffer)
			}

			// 解析并处理不同类型的message
			// console.log(response)
			response.messagesList.forEach((msg) => {
				const method = msg.method;
				switch (method) {
					case 'WebcastChatMessage':
						this._parseChatMsg(msg.payload);
						break;
					case 'WebcastGiftMessage':
						this._parseGiftMsg(msg.payload);
						break;
					case 'WebcastLikeMessage':
						this._parseLikeMsg(msg.payload);
						break;
					case 'WebcastMemberMessage':
						this._parseMemberMsg(msg.payload);
						break;
					case 'WebcastSocialMessage':
						this._parseSocialMsg(msg.payload);
						break;
					case 'WebcastRoomUserSeqMessage':
						this._parseRoomUserSeqMsg(msg.payload);
						break;
					case 'WebcastFansclubMessage':
						this._parseFansclubMsg(msg.payload);
						break;
					case 'WebcastControlMessage':
						this._parseControlMsg(msg.payload);
						break;
					case 'WebcastEmojiChatMessage':
						this._parseEmojiChatMsg(msg.payload);
						break;
					case 'WebcastRoomStatsMessage':
						this._parseRoomStatsMsg(msg.payload);
						break;
					case 'WebcastRoomMessage':
						this._parseRoomMsg(msg.payload);
						break;
					case 'WebcastRoomRankMessage':
						this._parseRankMsg(msg.payload);
						break;
					default:
						break;
				}
			});
		});

		ws.on('error', (error) => {
			console.error("WebSocket error:", error);
		});

		ws.on('close', () => {
			console.log("WebSocket connection closed.");
		});
	}

	_parseChatMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastChatMessage.decode(payload);
			// console.log(message)
			const userName = message.user.nickName;
			const userId = message.user.id;
			const content = message.content;
			// console.log(`【聊天msg】[${userId}][${userName}]: ${content}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseGiftMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastGiftMessage.decode(payload);
			// console.log(message)
			const userName = message.user.nickName;
			const giftName = message.gift.name;
			const giftCnt = message.totalCount && 1
			const diamondCount = message.gift.diamondCount;
			console.log(`【礼物msg】${userName} 送出了 ${giftName}x${giftCnt} 价值${diamondCount} 抖币`);
		}catch (e){
			console.log(e)
		}
	}

	_parseLikeMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastLikeMessage.decode(payload);
			const userName = message.user.nickName;
			const count = message.count;
			// console.log(`【点赞msg】${userName} 点了${count}个赞`);
		}catch (e){
			console.log(e)
		}
	}

	_parseMemberMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastMemberMessage.decode(payload);
			const userName = message.user.nickName;
			const userId = message.user.id;
			const gender = message.user.gender === 1 ? '女' : '男';
			// console.log(`【进场msg】[${userId}][${gender}][${userName}] 进入了直播间`);
		}catch (e){
			console.log(e)
		}
	}

	_parseSocialMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastSocialMessage.decode(payload);
			const userName = message.user.nickName;
			const userId = message.user.id;
			// console.log(`【关注msg】[${userId}][${userName}] 关注了主播`);
		}catch (e){
			console.log(e)
		}
	}

	_parseRoomUserSeqMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastRoomUserSeqMessage.decode(payload);
			const current = message.total;
			const total = message.totalPvForAnchor;
			console.log(`【统计msg】当前观看人数: ${current}, 累计观看人数: ${total}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseFansclubMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastFansclubMessage.decode(payload);
			const content = message.content;
			console.log(`【粉丝团msg】 ${content}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseEmojiChatMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastEmojiChatMessage.decode(payload);
			const emojiId = message.emoji_id;
			const user = message.user;
			const common = message.common;
			const defaultContent = message.default_content;
			// console.log(`【聊天表情包id】 ${emojiId}, user: ${user}, common: ${common}, default_content: ${defaultContent}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseRoomMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastRoomMessage.decode(payload);
			const common = message.common;
			const roomId = common.room_id;
			// console.log(`【直播间msg】直播间id: ${roomId}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseRoomStatsMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastRoomStatsMessage.decode(payload);
			const displayLong = message.displayLong;
			const displayValue = message.displayMiddle;
			// console.log(`【直播间统计msg】${displayLong}--${displayValue}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseRankMsg(payload) {
		try {
			const message = DouyinLoaders.WebcastRoomRankMessage.decode(payload);
			const ranksList = message.ranksList;
			// console.log(`【直播间排行榜msg】${JSON.stringify(ranksList)}`);
		}catch (e){
			console.log(e)
		}
	}

	_parseControlMsg(payload) {
		const message = DouyinLoaders.WebcastControlMessage(payload);

		try {
			if (message.status === 3) {
				console.log("直播间已结束");
				this.stop();
			}
		}catch (e){
			console.log(e)
		}
	}
}


const douyinLiveWebFetcher = new DouyinLiveWebFetcher('801749081128')

douyinLiveWebFetcher.start().then()