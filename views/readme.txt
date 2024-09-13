<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP verification</title>

    <!-- bootstrap 5 stylesheet -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.1/css/bootstrap.min.css" integrity="sha512-Ez0cGzNzHR1tYAv56860NLspgUGuQw16GiOOp/I2LuTmpSK9xDXlgJz3XN4cnpXWDmkNBKXR/VDMTCnAaEooxA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <!-- fontawesome 6 stylesheet -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css" integrity="sha512-SzlrxWUlpfuzQ+pcUCosxcglQRNAq/DZjVsC0lE40xsADsfeQoEypE+enwcOiGjk/bSuGGKHEyjSoQ1zVisanQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />


    <style>
        body {
            background-color: #ebecf0;
        }
        .otp-letter-input {
            max-width: 100%;
            height: 50px;
            border: 1px solid #198754;
            border-radius: 10px;
            color: #198754;
            font-size: 60px;
            text-align: center;
            font-weight: bold;
        }
        .btn {
            height: 50px;
        }
    </style>
</head>
<body>
    <div class="container p-3">
        <div class="row">
            <div class="col-md-3"></div>
            <div class="col-md-5 mt-4">
                <div class="bg-white p-5 rounded-3 shadow-sm border">
                    <div>
                        <form id="otpForm">
                        <p class="text-center text-success" style="font-size: 5.5rem;"><i class="fa-solid fa-envelope-circle-check"></i></p>
                        <p class="text-center h5">Please check your email</p>
                        <p class="text-muted text-center">We've sent a code to <strong>contact@curfcode.com</strong></p>
                        <div id="otp" class="inputs d-flex flex-row justify-content-center mt-2">
                            <input class="m-2 text-center form-control rounded" type="text" id="first" maxlength="1" />
                            <input class="m-2 text-center form-control rounded" type="text" id="second" maxlength="1" />
                            <input class="m-2 text-center form-control rounded" type="text" id="third" maxlength="1" />
                            <input class="m-2 text-center form-control rounded" type="text" id="fourth" maxlength="1" />
                            <input class="m-2 text-center form-control rounded" type="text" id="fifth" maxlength="1" />
                            <input class="m-2 text-center form-control rounded" type="text" id="sixth" maxlength="1" />
                        </div>
                        <p class="text-muted text-center"><%= locals.message ?? '' %></p>
                        <p class="text-muted text-center">Password expires in <b>3 minutes</b></p>
                        <p class="text-muted text-center">Didn't get the code? <a href="#" class="text-success">Click to resend.</a></p>
                        <div class="row pt-5">
                            <div class="col-6">
                                <button class="btn btn-outline-secondary w-100">Cancel</button>
                            </div>
                            <div class="col-6">
                                <button id="verifyBtn" class="btn btn-success w-100" type="submit">Verify</button>
                            </div>
                        </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        document.addEventListener("DOMContentLoaded", function(event) {
            function OTPInput() {
                const inputs = document.querySelectorAll('#otp > *[id]');
                for (let i = 0; i < inputs.length; i++) {
                    inputs[i].addEventListener('keydown', function(event) {
                        if (event.key === "Backspace") {
                            inputs[i].value = '';
                            if (i !== 0) inputs[i - 1].focus();
                        } else {
                            if (i === inputs.length - 1 && inputs[i].value !== '') {
                                return true;
                            } else if (event.keyCode > 47 && event.keyCode < 58) {
                                inputs[i].value = event.key;
                                if (i !== inputs.length - 1) inputs[i + 1].focus();
                                event.preventDefault();
                            } else if (event.keyCode > 64 && event.keyCode < 91) {
                                inputs[i].value = String.fromCharCode(event.keyCode);
                                if (i !== inputs.length - 1) inputs[i + 1].focus();
                                event.preventDefault();
                            }
                        }
                    });
                }

                // Log the input elements
                console.log(inputs);
            }

            OTPInput();

            // Add event listener for the Verify button
            document.getElementById('otpForm').addEventListener('submit', async function(event) {
                event.preventDefault(); // Prevent the default form submission

                const inputs = document.querySelectorAll('#otp > *[id]');
                let otpValue = '';
                inputs.forEach(input => {
                    otpValue += input.value;
                });
                console.log('Entered OTP:', otpValue);

                // Send OTP to the server
                try {
                    const response = await fetch('/verify-otp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ otp: otpValue })
                    });
                    const result = await response.json();
                    console.log('Server response:', result);
                } catch (error) { 
                    console.error('Error sending OTP:', error);
                }
            });
        });
    </script>
</body>
</html>











/// 
headers

<header>
        <!-- Header Start -->
        <div class="container-fluid">
            <nav class="navbar navbar-expand-lg navbar-light bg-light">
                <!-- Logo -->
                <a class="navbar-brand" href="index.html">
                    <img src="/public/admin/img/logo.png" alt="Logo" style="height: 90px;">
                </a>
                
                <!-- Toggle button for mobile menu -->
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <!-- Main menu -->
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="index.html">Home</a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Latest
                            </a>
                            <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                                <li><a class="dropdown-item" href="shop.html">Product list</a></li>
                                <li><a class="dropdown-item" href="product_details.html">Product Details</a></li>
                            </ul>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="blogDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Blog
                            </a>
                            <ul class="dropdown-menu" aria-labelledby="blogDropdown">
                                <li><a class="dropdown-item" href="blog.html">Blog</a></li>
                                <li><a class="dropdown-item" href="blog-details.html">Blog Details</a></li>
                            </ul>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="pagesDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Pages
                            </a>
                            <ul class="dropdown-menu" aria-labelledby="pagesDropdown">
                                <li><a class="dropdown-item" href="login.html">Login</a></li>
                                <li><a class="dropdown-item" href="cart.html">Cart</a></li>
                                <li><a class="dropdown-item" href="elements.html">Element</a></li>
                                <li><a class="dropdown-item" href="confirmation.html">Confirmation</a></li>
                                <li><a class="dropdown-item" href="checkout.html">Product Checkout</a></li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="contact.html">Contact</a>
                        </li>
                    </ul>
                    <!-- Header Right -->
                    <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="#"><i class="flaticon-search"></i></a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="login.html"><i class="flaticon-user"></i></a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="cart.html"><i class="flaticon-shopping-cart"></i></a>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
        <!-- Header End -->
    </header>


        <div class="card pt-3">
        <img src="/public/user/img/Me1stWatch.png" class="img-fluid w-50" alt="watch1">
        <div class="card-body">
            <h3 class="card-title">HAVIT HV-G92 Gamepad</h3>
            <p class="card-price">$120</p>
            <div class="card-ratings d-flex align-items-center">
                <div class="card-stars">
                    <!-- Star Icons -->
                    <i class="fas fa-star text-warning"></i>
                    <i class="fas fa-star text-warning"></i>
                    <i class="fas fa-star text-warning"></i>
                    <i class="fas fa-star text-warning"></i>
                    <i class="fas fa-star text-warning"></i>
                </div>
                <p class="card-rating-numbers ms-2">(88)</p>
            </div>
            <button class="btn btn-primary add-to-cart" data-id="1" data-title="HAVIT HV-G92 Gamepad" data-image="./image/items/item-1.png" data-price="120">
                Add to Cart
            </button>
        </div>
    </div>




     <!-- Related Products -->
    <div class="container related-products">
        <h2>Related Products</h2>
        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <img src="related1.jpg" alt="Fossil Grant Brown Watch" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">Fossil Grant Brown Watch</h5>
                        <p class="card-text">₹18,895 <span class="text-muted">₹21,000</span></p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <img src="related2.jpg" alt="Rolex Date 34 Steel White Gold" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">Rolex Date 34 Steel White Gold</h5>
                        <p class="card-text">₹110,000 <span class="text-muted">₹125,000</span></p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <img src="related3.jpg" alt="Armani Exchange Brown" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">Armani Exchange Brown</h5>
                        <p class="card-text">₹7,500 <span class="text-muted">₹9,000</span></p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <img src="related4.jpg" alt="Diesel Sideshow Black" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">Diesel Sideshow Black</h5>
                        <p class="card-text">₹5,500 <span class="text-muted">₹7,000</span></p>
                    </div>
                </div>
            </div>
        </div>
    </div>







            <div class="col-md-4">
            <div class="p-3 py-5">
                <div class="d-flex justify-content-between align-items-center experience"><span>Edit Experience</span><span class="border px-3 p-1 add-experience"><i class="fa fa-plus"></i>&nbsp;Experience</span></div><br>
                <div class="col-md-12"><label class="labels">Experience in Designing</label><input type="text" class="form-control" placeholder="experience" value=""></div> <br>
                <div class="col-md-12"><label class="labels">Additional Details</label><input type="text" class="form-control" placeholder="additional details" value=""></div>
            </div>
        </div>




        profile 

         <!-- <% orderData.forEach(order => { %>
        <% order.products.forEach(element => { %>
        <div class="col-md-12">
            <div class="address-card">
                <div class="row">
                    <div class="col-md-2 d-flex align-items-center" >
                        <img style="width:60px; margin-left: 10px;"  src="/public/productImgs/<%= element.product_id.images.image1 %>" alt="">
                    </div>
                    <div class="col-md-2">
                        <p class="mb-1"><strong><%= element.product_id.product_name %></strong></p>
                    </div>
                    <div class="col-md-2 ">
                        <p class="mb-1 fw-bold" style="margin-left: 19px;">₹<%= element.total_price %></p>
                    </div>
                    <div class="col-md-2 ">
                        <p class="mb-1 fw-bold" style="margin-left: 19px;"><%= element.quantity %></p>
                    </div>
                     <div class="col-md-2">
                        <% if(element.status == "pending"){   %>                      
                            <span class="fw-bold text-primary fs-4"><%= element.status %></span>
                        <%} else if(element.status == "delivered"){ %>
                            <span class="fw-bold text-success fs-4"><%= element.status %></span>
                        <%}else if(element.status == "cancelled"){%>%>
                            <span class="fw-bold text-danger fs-4"><%= element.status %></span>
                        <%}%>
                        
                    </div>
                   <div class="col-md-2 ">
                    
                    <% if(element.status == "pending"){ %>
                        <button class="btn btn-danger fs-4" onclick="cancelOrder('<%= element._id %>','<%= order._id %>',)">Cancel</button>
                   <% }else if(element.status == "delivered"){ %>
                        <span class="badge bg-success fs-4">Delivered</span>
                    <% } else if(element.status == "cancelled"){ %>
                        <span class="badge bg-danger fs-4">Cancelled</span>
                    <% } %>
                    </div>
                </div>
            </div>
        </div>
         <%}); %>
     <%}); %> -->




<% if(element.status == "pending"){ %>
                      <div class="d-flex aligin-items-center justify-contern-center">
                         <div class="mx-2">
                         <a
                          href="/admin/orderManagment/deliverd/<%= order._id %>/<%= element._id %>"
                          type="button"
                          class=" btn btn-success  btn-sm"
                        > 
                            <span>Deliverd</span>
                        </a>
                        </div>

                      <div class="ml-2">
                        
                       
                          <a
                          href="/admin/orderManagment/cancel/<%= order._id %>/<%= element._id %>"
                          type="button"
                          class=" btn btn-danger btn-sm"
                        > 
                             <span>Cancel</span>
                            </a>
                      </div>
                      </div>
                      <% }else if(element.status == "delivered"){ %>
                        <span class="badge bg-success">Delivered</span>
                      <% } else if(element.status == "cancelled"){ %>
                        <span class="badge bg-danger">Cancelled</span>
                      <% } %>