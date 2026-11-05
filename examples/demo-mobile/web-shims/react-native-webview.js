import React from 'react';
import { View } from 'react-native';

export const WebView = ({ source, style, testID }) => {
  const html = source && typeof source === 'object' ? source.html : '';
  const uri = source && typeof source === 'object' ? source.uri : '';

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]} testID={testID}>
      <iframe
        title="SovereignEmbeddedWebView"
        srcDoc={html || undefined}
        src={!html && uri ? uri : undefined}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
};

export default WebView;
