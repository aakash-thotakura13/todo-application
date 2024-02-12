import React, { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';

const SimpleGraph = ({ allTasks }) => {

  const tasksPerDay = allTasks
    // .map(ele => `${new Date(ele.completeBy).getMonth() + 1}/${new Date(ele.completeBy).getDate()}/${new Date(ele.completeBy).getUTCFullYear()}`)
    // .filter(ele => new Date(ele.completeBy) < new Date())
    .map(ele => `${new Date(ele.completeBy).getMonth() + 1}/${new Date(ele.completeBy).getDate()}`)
    .map(String)
    .sort((a, b) => new Date(`2024/${a}`) - new Date(`2024/${b}`))
    .reduce((acc, currentValue) => {
      acc[currentValue] = (acc[currentValue] || 0) + 1;
      return acc;
    }, {});

  const completedTasks = allTasks
    .filter(ele => ele.isChecked === true)
    .map(ele => `${new Date(ele.completeBy).getMonth() + 1}/${new Date(ele.completeBy).getDate()}`)
    .map(String)
    .sort((a, b) => new Date(`2024/${a}`) - new Date(`2024/${b}`))
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
      type: "line",
      data: {
        labels: [...Object.keys(tasksPerDay)],
        datasets: [{
          type: "line",
          label: 'TTs/Day',
          data: [...Object.values(completedTasks)],
          fill: true,
          backgroundColor: 'antiquewhite',
          borderColor: 'burlywood',
          borderWidth: 1,
          tension: 0.4,
        }, {
          type: "line",
          label: 'CTs/Day',
          data: [...Object.values(tasksPerDay)],
          fill: true,
          backgroundColor: 'burlywood',
          borderColor: 'antiquewhite',
          borderWidth: 1,
          tension: 0.4,
        },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            // stacked: true,
          },
          x: {
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