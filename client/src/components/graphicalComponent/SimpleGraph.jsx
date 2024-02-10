import React, { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';

const SimpleGraph = ({ allTasks }) => {

  const tasksPerDay = allTasks
    .map(ele => `${new Date(ele.completeBy).getMonth() + 1}/${new Date(ele.completeBy).getDate()}/${new Date(ele.completeBy).getUTCFullYear()}`)
    .map(String)
    .reduce((acc, currentValue) => {
      acc[currentValue] = (acc[currentValue] || 0) + 1;
      return acc;
    }, {});

  const chartRef = useRef();
  const [chartInstance, setChartInstance] = useState(null);

  useEffect(() => {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const newChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [...Object.keys(tasksPerDay)],
        datasets: [{
          label: 'Tasks/day',
          data: [...Object.values(tasksPerDay)],
          fill: true,
          backgroundColor: 'rgba(201, 203, 207, 0.2)',
          borderColor: 'rgb(201, 203, 207)',
          borderWidth: 1,
          tension: 0.4,
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            stacked: true,
          },
        }
      }
    });

    setChartInstance(newChartInstance);

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);

  return <canvas ref={chartRef} />;
};

export default SimpleGraph;