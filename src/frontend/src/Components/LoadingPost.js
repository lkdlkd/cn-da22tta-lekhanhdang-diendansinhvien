const LoadingPost = () => (
    <div style={{
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      padding: "16px",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-wrapper {
          position: relative;
          overflow: hidden;
          background: #f0f2f5;
        }
        .shimmer-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <div className="shimmer-wrapper" style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%"
        }}></div>
        <div style={{ flex: 1 }}>
          <div className="shimmer-wrapper" style={{
            width: "40%",
            height: "16px",
            borderRadius: "4px",
            marginBottom: "8px"
          }}></div>
          <div className="shimmer-wrapper" style={{
            width: "30%",
            height: "14px",
            borderRadius: "4px"
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="shimmer-wrapper" style={{
        width: "100%",
        height: "80px",
        borderRadius: "4px",
        marginBottom: "12px"
      }}></div>

      {/* Image placeholder */}
      <div className="shimmer-wrapper" style={{
        width: "100%",
        height: "300px",
        borderRadius: "8px",
        marginBottom: "12px"
      }}></div>

      {/* Action buttons */}
      <div style={{
        display: "flex",
        gap: "8px",
        paddingTop: "12px",
        borderTop: "1px solid #e4e6eb"
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="shimmer-wrapper" style={{
            width: "80px",
            height: "36px",
            borderRadius: "6px"
          }}></div>
        ))}
      </div>
    </div>
  );

export default LoadingPost;