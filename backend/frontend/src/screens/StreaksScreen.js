import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from './AuthScreen';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  }
};

const StreaksScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [myStreaks, setMyStreaks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('my-streaks');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'my-streaks') {
        await fetchMyStreaks();
      } else if (activeTab === 'leaderboard') {
        await fetchLeaderboard();
      } else if (activeTab === 'stats') {
        await fetchStats();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  };

  const fetchMyStreaks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streaks/my-streaks`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMyStreaks(response.data.streaks || []);
    } catch (error) {
      console.error('Error fetching streaks:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streaks/leaderboard`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streaks/stats`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const resetStreak = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/streaks/${userId}/reset`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      Alert.alert('Success', 'Streak reset successfully');
      fetchMyStreaks();
    } catch (error) {
      console.error('Error resetting streak:', error);
      Alert.alert('Error', 'Failed to reset streak');
    }
  };

  const getStreakEmoji = (streak) => {
    if (streak.currentStreak >= 100) return '🏆';
    if (streak.currentStreak >= 50) return '💎';
    if (streak.currentStreak >= 30) return '👑';
    if (streak.currentStreak >= 14) return '🌟';
    if (streak.currentStreak >= 7) return '🔥';
    if (streak.currentStreak >= 3) return '⭐';
    return '🔥';
  };

  const getStreakColor = (streak) => {
    if (streak.currentStreak >= 30) return THEME.colors.primary;
    if (streak.currentStreak >= 14) return THEME.colors.secondary;
    if (streak.currentStreak >= 7) return '#FF6B6B';
    if (streak.currentStreak >= 3) return '#4ECDC4';
    return THEME.colors.textDim;
  };

  const renderStreakItem = ({ item }) => {
    const otherUser = item.users.find(u => u._id !== user._id);
    const streakEmoji = getStreakEmoji(item);
    const streakColor = getStreakColor(item);
    
    return (
      <View style={styles.streakItem}>
        <View style={styles.streakHeader}>
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: otherUser.profilePhoto }} 
              style={styles.userAvatar}
            />
            <View>
              <Text style={styles.userName}>{otherUser.username}</Text>
              <Text style={styles.streakStatus}>
                {item.currentStreak > 0 ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>{streakEmoji}</Text>
            <Text style={[styles.streakCount, { color: streakColor }]}>
              {item.currentStreak}
            </Text>
          </View>
        </View>

        <View style={styles.streakDetails}>
          <View style={styles.streakStat}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={[styles.statValue, { color: streakColor }]}>
              {item.currentStreak} days
            </Text>
          </View>
          <View style={styles.streakStat}>
            <Text style={styles.statLabel}>Longest</Text>
            <Text style={styles.statValue}>
              {item.longestStreak} days
            </Text>
          </View>
          <View style={styles.streakStat}>
            <Text style={styles.statLabel}>Last Share</Text>
            <Text style={styles.statValue}>
              {item.lastSharedDate 
                ? new Date(item.lastSharedDate).toLocaleDateString()
                : 'Never'
              }
            </Text>
          </View>
        </View>

        {item.milestoneRewards.length > 0 && (
          <View style={styles.rewardsContainer}>
            <Text style={styles.rewardsTitle}>Milestones:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.milestoneRewards.map((reward, index) => (
                <View key={index} style={styles.rewardChip}>
                  <Text style={styles.rewardEmoji}>{reward.rewardValue}</Text>
                  <Text style={styles.rewardText}>{reward.streakCount} days</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {item.currentStreak > 0 && (
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => resetStreak(otherUser._id)}
          >
            <Text style={styles.resetButtonText}>Reset Streak</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    
    return (
      <View style={styles.leaderboardItem}>
        <Text style={styles.rankText}>{medal}</Text>
        <Image 
          source={{ uri: item.user.profilePhoto }} 
          style={styles.leaderboardAvatar}
        />
        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardName}>{item.user.username}</Text>
          <Text style={styles.leaderboardStats}>
            Best: {item.bestCurrentStreak} | Longest: {item.bestLongestStreak}
          </Text>
        </View>
        <View style={styles.leaderboardScore}>
          <Text style={styles.scoreText}>{item.bestCurrentStreak}</Text>
          <Text style={styles.scoreLabel}>days</Text>
        </View>
      </View>
    );
  };

  const renderStatsContent = () => {
    if (!stats) return null;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="fire" size={32} color={THEME.colors.primary} />
          <Text style={styles.statNumber}>{stats.totalStreaks}</Text>
          <Text style={styles.statDescription}>Total Streaks</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="flash" size={32} color={THEME.colors.secondary} />
          <Text style={styles.statNumber}>{stats.activeStreaks}</Text>
          <Text style={styles.statDescription}>Active Streaks</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.statNumber}>{stats.longestStreak}</Text>
          <Text style={styles.statDescription}>Longest Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="stats-chart" size={32} color="#4ECDC4" />
          <Text style={styles.statNumber}>{stats.avgStreakLength}</Text>
          <Text style={styles.statDescription}>Avg Length</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="gift" size={32} color="#FF6B6B" />
          <Text style={styles.statNumber}>{stats.totalRewards}</Text>
          <Text style={styles.statDescription}>Rewards Earned</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streaks</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MediaShare')}>
          <Ionicons name="share" size={24} color={THEME.colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my-streaks' && styles.activeTab]}
          onPress={() => setActiveTab('my-streaks')}
        >
          <Text style={[styles.tabText, activeTab === 'my-streaks' && styles.activeTabText]}>
            My Streaks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.secondary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'my-streaks' && (
            <FlatList
              data={myStreaks}
              renderItem={renderStreakItem}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="flame-outline" size={64} color={THEME.colors.textDim} />
                  <Text style={styles.emptyText}>No active streaks</Text>
                  <Text style={styles.emptySubtext}>
                    Start sharing media with friends to build streaks!
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === 'leaderboard' && (
            <FlatList
              data={leaderboard}
              renderItem={renderLeaderboardItem}
              keyExtractor={item => item.user._id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="trophy-outline" size={64} color={THEME.colors.textDim} />
                  <Text style={styles.emptyText}>No leaderboard data</Text>
                </View>
              }
            />
          )}

          {activeTab === 'stats' && renderStatsContent()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: THEME.colors.secondary,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 14,
  },
  activeTabText: {
    color: THEME.colors.secondary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakItem: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userName: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakStatus: {
    color: THEME.colors.textDim,
    fontSize: 14,
    marginTop: 2,
  },
  streakBadge: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  streakDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  streakStat: {
    alignItems: 'center',
  },
  statLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardsContainer: {
    marginBottom: 15,
  },
  rewardsTitle: {
    color: THEME.colors.textDim,
    fontSize: 14,
    marginBottom: 10,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  rewardEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  rewardText: {
    color: THEME.colors.text,
    fontSize: 12,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
    width: 40,
    textAlign: 'center',
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardStats: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardScore: {
    alignItems: 'center',
  },
  scoreText: {
    color: THEME.colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  statNumber: {
    color: THEME.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statDescription: {
    color: THEME.colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtext: {
    color: THEME.colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
});

export default StreaksScreen;
