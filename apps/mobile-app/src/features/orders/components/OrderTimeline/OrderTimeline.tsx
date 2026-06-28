import React from 'react';
import { View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { OrderTimelineEvent } from '../../hooks/orders.mock';
import { stylesFactory } from './OrderTimeline.styles';

interface OrderTimelineProps {
  events: OrderTimelineEvent[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <View style={styles.container} testID="order-timeline">
      <RNText style={styles.title}>{t('orders.timelineTitle')}</RNText>

      {sortedEvents.map((event, index) => {
        const isLast = index === sortedEvents.length - 1;
        const formattedDate = new Date(event.timestamp).toLocaleString();

        return (
          <View
            key={event.timestamp}
            style={styles.timelineItem}
            testID={`timeline-event-${index}`}
          >
            <View style={styles.indicatorContainer}>
              <View
                style={[styles.dot, index === 0 ? {} : { backgroundColor: theme.colors.border }]}
              />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.contentContainer}>
              <RNText style={styles.statusText}>{event.status}</RNText>
              <RNText style={styles.descText}>{event.description}</RNText>
              <RNText style={styles.timeText}>{formattedDate}</RNText>
            </View>
          </View>
        );
      })}
    </View>
  );
};
