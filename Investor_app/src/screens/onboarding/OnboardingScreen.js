import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../../components/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
    {
        id: '1',
        icon: 'chart-line',
        iconBg: ['#5B5CFF', '#7C3AED'],
        title: 'What is Investing?',
        subtitle: 'Grow Your Wealth',
        description: 'Investing means putting your money to work. Instead of sitting idle, your money grows over time through smart investments.',
        tips: [
            { icon: 'currency-inr', text: 'Start with as little as ₹10,000' },
            { icon: 'chart-pie', text: 'Diversify to reduce risk' },
            { icon: 'clock-outline', text: 'Patience leads to better returns' },
        ],
    },
    {
        id: '2',
        icon: 'wallet-outline',
        iconBg: ['#00C853', '#00A844'],
        title: 'Your Portfolio',
        subtitle: 'Track Everything',
        description: 'See all your investments in one place. Monitor growth, track returns, and make informed decisions with real-time data.',
        tips: [
            { icon: 'cash-multiple', text: 'Portfolio = Total value of investments' },
            { icon: 'trending-up', text: 'Returns = Profit from your investments' },
            { icon: 'progress-check', text: 'Progress = Project completion status' },
        ],
    },
    {
        id: '3',
        icon: 'shield-check',
        iconBg: ['#FFB300', '#FF9500'],
        title: 'Protected Investing',
        subtitle: 'Privilege Chain Security',
        description: 'Every major change requires approval from ALL investors. Your voice matters. No decisions are made without your consent.',
        tips: [
            { icon: 'vote', text: 'Vote on all important changes' },
            { icon: 'eye-outline', text: 'Full transparency on decisions' },
            { icon: 'account-group', text: 'Democratic project governance' },
        ],
    },
];

export default function OnboardingScreen({ onComplete }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);

    const handleNext = () => {
        if (currentIndex < ONBOARDING_SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete?.();
        }
    };

    const handleSkip = () => {
        onComplete?.();
    };

    const renderSlide = ({ item }) => (
        <View style={styles.slide}>
            {/* Icon */}
            <View style={styles.iconWrapper}>
                <LinearGradient colors={item.iconBg} style={styles.iconCircle}>
                    <MaterialCommunityIcons name={item.icon} size={48} color="white" />
                </LinearGradient>
            </View>

            {/* Content */}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.description}>{item.description}</Text>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
                {item.tips.map((tip) => (
                    <View key={`${tip.icon}-${tip.text}`} style={styles.tipRow}>
                        <View style={styles.tipIcon}>
                            <MaterialCommunityIcons name={tip.icon} size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.tipText}>{tip.text}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Skip */}
            {!isLastSlide && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            )}

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_SLIDES}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(index);
                }}
                scrollEnabled={false}
            />

            {/* Footer */}
            <View style={styles.footer}>
                {/* Pagination */}
                <View style={styles.pagination}>
                    {ONBOARDING_SLIDES.map((slide, index) => (
                        <View
                            key={slide.id}
                            style={[styles.dot, index === currentIndex && styles.dotActive]}
                        />
                    ))}
                </View>

                {/* Next Button */}
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                    <LinearGradient colors={['#5B5CFF', '#7C3AED']} style={styles.nextGradient}>
                        <Text style={styles.nextText}>{isLastSlide ? 'Get Started' : 'Continue'}</Text>
                        <MaterialCommunityIcons
                            name={isLastSlide ? 'rocket-launch' : 'arrow-right'}
                            size={20}
                            color="white"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

OnboardingScreen.propTypes = {
    onComplete: PropTypes.func,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    skipBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        ...theme.typography.small,
        color: theme.colors.textSecondary,
    },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: 32,
        paddingTop: 60,
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: 28,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        ...theme.typography.bodyMedium,
        color: theme.colors.primary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 16,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 24,
    },
    tipsCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
        ...theme.shadows.soft,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    tipIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    tipText: {
        flex: 1,
        ...theme.typography.small,
        color: theme.colors.textPrimary,
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
        marginHorizontal: 4,
    },
    dotActive: {
        width: 28,
        backgroundColor: theme.colors.primary,
    },
    nextBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        ...theme.shadows.card,
    },
    nextGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    nextText: {
        ...theme.typography.cta,
        color: 'white',
    },
});
