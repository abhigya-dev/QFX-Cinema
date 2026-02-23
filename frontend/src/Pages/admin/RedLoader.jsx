import React from "react";

const RedLoader = () => {
  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#fff", // change if needed
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f8d7da",   // light red background ring
    borderTop: "5px solid #d00000", // strong red accent
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

// Add this to your global CSS file
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/

export default RedLoader;
