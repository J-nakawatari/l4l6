  const fetchPriceInfo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/payments/price-info/price_1RjdEc016yQ2BmmpXSpWjIsP`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPriceInfo(data);
      }
    } catch (error) {
      console.error('Error fetching price info:', error);
    }
  };