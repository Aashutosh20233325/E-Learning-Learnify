import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut ,userRegistered} from "../authSlice"; // Ensure correct path


const USER_API = "https://devskill-hub.onrender.com/api/v1/user/";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({
        baseUrl: USER_API,
        credentials: "include",
    }),
    endpoints: (builder) => ({
        registerUser: builder.mutation({
            query: (inputData) => {
                //console.log("inputData", inputData); 
                return {
                url: "register",
                method: "POST",
                body: inputData,
                };
            },
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userRegistered({ user: result.data.user }));
                    const email = result.data.user.email;
                    //console.log("Email for OTP:", email); 
                    await dispatch(
                        authApi.endpoints.sendOtp.initiate({ email, purpose: "email_verification" })
                    ).unwrap();

                    window.location.href = `/verify-email`;

                } catch (error) {

                    console.error("Registration Error:", error);
                }
            }
    }),

        loginUser: builder.mutation({
            query: (inputData) => ({
                
                url: "login",
                method: "POST",
                body: inputData,
            }),
            
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
        verifyEmail: builder.mutation({
            query: (inputData) => ({    
                url: "verify-email",
                method: "POST",
                body: inputData,
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    console.error("Email Verification Error:", error);
                }
            }
        }),
        forgotPassword: builder.mutation({
            query: (inputData) => ({
                url: "forgot-password",
                method: "POST",
                body: inputData,
            }),
        }),
        resetPassword: builder.mutation({
            query: (inputData) => ({
                url: "reset-password",
                method: "POST",
                body: inputData,
            }),
        }),
        sendOtp: builder.mutation({
            query: (inputData) => ({
                url: "send-otp",
                method: "POST",
                body: inputData,
            }),
            async onQueryStarted(_, { queryFulfilled }) {
            try {
                console.log("Sending OTP...");
                await queryFulfilled;
                localStorage.setItem("lastOtpSentAt", Date.now().toString()); // Save OTP sent time
            } catch (err) {
                console.error("Send OTP failed:", err);
            }
        }
        }),
        
        logoutUser: builder.mutation({
            query: () => ({
                url: "logout",
                method: "GET"
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    dispatch(userLoggedOut({ user: null }));
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
        loadUser:builder.query({
            query:()=>({
                url:"profile",
                method:"GET"
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    console.log("User data loaded:", result.data.user);
                    const loadeduser = result.data.user;
                    if(loadeduser.isEmailVerified){
                        dispatch(userLoggedIn({ user: loadeduser }));
                    }else{
                        dispatch(userRegistered({ user: loadeduser }));
                    }
                    
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
    
        
        updateUser: builder.mutation({
            query: (formData) => ({
                url:"profile/update",
                method:"PUT",
                body:formData,
                credentials:"include"
            })
        })
    }),

});

export const { useRegisterUserMutation, useLoginUserMutation ,useLoadUserQuery,useLogoutUserMutation,useUpdateUserMutation, useVerifyEmailMutation,useForgotPasswordMutation,useResetPasswordMutation,useSendOtpMutation} = authApi;
export default authApi;
