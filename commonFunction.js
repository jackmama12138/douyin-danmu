const ProtoBufJs = require('protobufjs')
const zlib = require('zlib')
const path = require('path')
const DouyinLoader = ProtoBufJs.loadSync(path.join(__dirname, './dy.proto'));
const WebcastResponse = DouyinLoader.lookupType("douyin.Response");
const WebcastPushFrame = DouyinLoader.lookupType("douyin.PushFrame");
const WebcastChatMessage = DouyinLoader.lookupType("douyin.ChatMessage");
const WebcastGiftMessage = DouyinLoader.lookupType("douyin.GiftMessage");
const WebcastLikeMessage = DouyinLoader.lookupType("douyin.LikeMessage");
const WebcastMemberMessage = DouyinLoader.lookupType("douyin.MemberMessage");
const WebcastSocialMessage = DouyinLoader.lookupType("douyin.SocialMessage");
const WebcastRoomUserSeqMessage = DouyinLoader.lookupType("douyin.RoomUserSeqMessage");
const WebcastFansclubMessage = DouyinLoader.lookupType("douyin.FansclubMessage");
const WebcastControlMessage = DouyinLoader.lookupType("douyin.ControlMessage");
const WebcastEmojiChatMessage = DouyinLoader.lookupType("douyin.EmojiChatMessage");
const WebcastRoomStatsMessage = DouyinLoader.lookupType("douyin.RoomStatsMessage");
const WebcastRoomMessage =DouyinLoader.lookupType("douyin.RoomMessage");
const WebcastRoomRankMessage = DouyinLoader.lookupType("douyin.RoomRankMessage");

exports.DouyinLoaders = {
	WebcastResponse,
	WebcastPushFrame,
	WebcastChatMessage,
	WebcastGiftMessage,
	WebcastLikeMessage,
	WebcastMemberMessage,
	WebcastSocialMessage,
	WebcastRoomUserSeqMessage,
	WebcastFansclubMessage,
	WebcastControlMessage,
	WebcastEmojiChatMessage,
	WebcastRoomStatsMessage,
	WebcastRoomMessage,
	WebcastRoomRankMessage,
}