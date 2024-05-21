const { createApp } = Vue;

    createApp({
        mounted() {
            this.productRow = this.$refs.productRow;
        },
        methods: {
            scrollLeft() {
                this.productRow.scrollBy({ left: -this.productRow.clientWidth, behavior: 'smooth' });
            },
            scrollRight() {
                this.productRow.scrollBy({ left: this.productRow.clientWidth, behavior: 'smooth' });
            }
        }
    }).mount('#app');