import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './ProductSpecs.styles';

export interface Specification {
  labelKey: string;
  value: string;
  isTranslationValue?: boolean;
}

interface ProductSpecsProps {
  specifications: Specification[];
}

export const ProductSpecs: React.FC<ProductSpecsProps> = ({ specifications }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.glassContainer} testID="product-specs-container">
      <View style={styles.section}>
        <Text variant="bold" style={styles.sectionTitle}>
          {t('catalog.descriptionTitle')}
        </Text>
        <Text variant="body" style={styles.descriptionText} testID="product-details-description">
          {t('catalog.mockDescription')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="bold" style={styles.sectionTitle}>
          {t('catalog.specificationsTitle')}
        </Text>
        <View style={styles.specsTable} testID="product-specs-table">
          {specifications.map((spec, index) => {
            const isLast = index === specifications.length - 1;
            return (
              <View
                key={spec.labelKey}
                style={isLast ? styles.specRowLast : styles.specRow}
                testID={`spec-row-${index}`}
              >
                <Text variant="bold" style={styles.specLabel}>
                  {t(spec.labelKey)}
                </Text>
                <Text variant="body" style={styles.specValue}>
                  {spec.isTranslationValue ? t(spec.value) : spec.value}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};
