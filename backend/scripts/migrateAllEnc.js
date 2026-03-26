const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
require('dotenv').config();

const migrateAll = async () => {
    try {
        console.log('🚀 [MIGRATION] Starting Full Database Encryption Migration...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Users
        const users = await User.find({});
        console.log(`👤 Processing ${users.length} users...`);
        for (let user of users) {
            const raw = user.toObject({ getters: false });
            let needsUpdate = false;
            if (raw.username && !raw.username.startsWith('enc:')) { user.username = raw.username; needsUpdate = true; }
            if (raw.email && !raw.email.startsWith('enc:')) { user.email = raw.email; needsUpdate = true; }
            if (raw.profilePhoto && !raw.profilePhoto.startsWith('enc:')) { user.profilePhoto = raw.profilePhoto; needsUpdate = true; }
            if (raw.bio && !raw.bio.startsWith('enc:')) { user.bio = raw.bio; needsUpdate = true; }
            if (raw.otp && !raw.otp.startsWith('enc:')) { user.otp = raw.otp; needsUpdate = true; }
            if (needsUpdate) await user.save();
        }

        // 2. Profiles
        const profiles = await Profile.find({});
        console.log(`📋 Processing ${profiles.length} profiles...`);
        for (let profile of profiles) {
            const raw = profile.toObject({ getters: false });
            let needsUpdate = false;
            if (raw.username && !raw.username.startsWith('enc:')) { profile.username = raw.username; needsUpdate = true; }
            if (raw.fullName && !raw.fullName.startsWith('enc:')) { profile.fullName = raw.fullName; needsUpdate = true; }
            if (raw.email && !raw.email.startsWith('enc:')) { profile.email = raw.email; needsUpdate = true; }
            if (raw.bio && !raw.bio.startsWith('enc:')) { profile.bio = raw.bio; needsUpdate = true; }
            if (raw.avatar && !raw.avatar.startsWith('enc:')) { profile.avatar = raw.avatar; needsUpdate = true; }
            if (raw.coverImage && !raw.coverImage.startsWith('enc:')) { profile.coverImage = raw.coverImage; needsUpdate = true; }
            if (raw.phone && !raw.phone.startsWith('enc:')) { profile.phone = raw.phone; needsUpdate = true; }
            if (raw.website && !raw.website.startsWith('enc:')) { profile.website = raw.website; needsUpdate = true; }
            if (raw.location) {
               if (raw.location.country && !raw.location.country.startsWith('enc:')) { profile.location.country = raw.location.country; needsUpdate = true; }
               if (raw.location.state && !raw.location.state.startsWith('enc:')) { profile.location.state = raw.location.state; needsUpdate = true; }
               if (raw.location.city && !raw.location.city.startsWith('enc:')) { profile.location.city = raw.location.city; needsUpdate = true; }
            }
            if (needsUpdate) await profile.save();
        }

        // 3. Messages
        const messages = await Message.find({});
        console.log(`✉️ Processing ${messages.length} messages...`);
        for (let msg of messages) {
            const raw = msg.toObject({ getters: false });
            let needsUpdate = false;
            if (raw.content && !raw.content.startsWith('enc:')) { msg.content = raw.content; needsUpdate = true; }
            if (raw.mediaUrl && !raw.mediaUrl.startsWith('enc:')) { msg.mediaUrl = raw.mediaUrl; needsUpdate = true; }
            if (raw.fileName && !raw.fileName.startsWith('enc:')) { msg.fileName = raw.fileName; needsUpdate = true; }
            if (needsUpdate) await msg.save();
        }

        // 4. Chats
        const chats = await Chat.find({});
        console.log(`💬 Processing ${chats.length} chats...`);
        for (let chat of chats) {
            const raw = chat.toObject({ getters: false });
            let needsUpdate = false;
            if (raw.chatName && !raw.chatName.startsWith('enc:')) { chat.chatName = raw.chatName; needsUpdate = true; }
            if (raw.groupPhoto && !raw.groupPhoto.startsWith('enc:')) { chat.groupPhoto = raw.groupPhoto; needsUpdate = true; }
            if (needsUpdate) await chat.save();
        }

        console.log('🏁 [MIGRATION-COMPLETE] 100% Blind Database achieved.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
};

migrateAll();
